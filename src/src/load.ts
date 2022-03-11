
import { DataBaseBase } from './mariadb-base';
import { getId, getDBConfig, CustomOmit, shouldAddColumn } from './utils';
import { update, pushUpdate } from './update';
import { save } from './save';
import { intercept } from './intercept';
import { Mappings } from './interface/mapping-types';
import { ConstructorClass, ISaveAbleObject } from './interface/mapping';
import { ColumnOption, OneToManyMappingOptions, Transformations } from './annotations/database-annotation';
import { type } from 'os';
import { ColumnDefinition } from './annotations/database-config';
import { SqlCondition } from './sql-condition';

export interface LoadOptions<T> {
	deep?: boolean | Array<string | SqlCondition> | { [key: string]: string | SqlCondition | { filter: string | SqlCondition, depths: number } },
	first?: boolean,
	idOnNonDeepOneToOne?: boolean
}

export interface LoadParams<T, F = string | number | SqlCondition | ((obj: T) => any), O = LoadOptions<T>> {
	filter?: F
	params?: Array<string | number> | string

	options?: O
}

export type SqlParameter = string | number


export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any | LoadParams<T, (obj: T) => any, { first: true } & CustomOmit<LoadOptions<T>, "first">>, parameters: undefined | undefined[], options: { first: true } & CustomOmit<LoadOptions<T>, "first">): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string | SqlCondition | LoadParams<T, string, { first: true } & CustomOmit<LoadOptions<T>, "first">>, parameters: Array<string | number> | string, options: { first: true } & CustomOmit<LoadOptions<T>, "first">): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string | SqlCondition | LoadParams<T, string>, parameters?: Array<string | number> | string, options?: LoadOptions<T>): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any | LoadParams<T, (obj: T) => any>, parameters?: undefined | undefined[], options?: LoadOptions<T>): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: number | LoadParams<T, number>, parameters?: Array<string | number> | string, options?: LoadOptions<T>): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string | SqlCondition | number | ((obj: T) => any) | LoadParams<T>, parameters: Array<string | number> | string = [], options: LoadOptions<T> = {}): Promise<T | Array<T>> {
	const db = getDBConfig<T>(findClass);
	let sql = "SELECT * FROM `" + db.table + "` ";



	let params: Array<SqlParameter> = [];
	let filter: string | SqlCondition | ((obj: T) => any) | number;
	if (typeof primaryKeyOrFilter == "object") {
		if (primaryKeyOrFilter instanceof SqlCondition) {
			filter = primaryKeyOrFilter
		} else {
			filter = primaryKeyOrFilter.filter;
			parameters = primaryKeyOrFilter.params
			options = primaryKeyOrFilter.options
		}
	} else {
		filter = primaryKeyOrFilter;
	}

	if (typeof filter != "undefined") {
		sql += "WHERE ";
	}

	if (typeof filter == "string") {
		sql += filter;

		if (typeof parameters === "string") {
			parameters = [parameters];
		}

		parameters.forEach(param => {
			params.push(param)
		});
	} else if (typeof filter === "function") {
		// format :  s => s.id = +req.params.id
		const tempObj = new findClass();
		for (let column in db.columns) {
			tempObj[column] = column as any;
		}
		filter(tempObj);

		const previousLength = params.length;
		sql += Object.values<any>(db.columns)
			.filter(column => tempObj[column.modelName] !== column.modelName)
			.map(column => {
				const value = tempObj[column.modelName]
				if (value !== undefined) {
					sql += column.dbTableName + " = ?";
					params.push(value)
				} else {
					throw new Error("invalid value")
				}
				return `\`${column.dbTableName}\` = ?`
			})
			.join(' \nAND ');

		if (previousLength === params.length) {
			throw new Error("missing filter");
		}
	} else if (typeof filter == "number") {
		sql += db.modelPrimary + " = ?";
		params.push(filter)
	} else if (filter instanceof SqlCondition) {
		sql += filter.build(params)
	}

	const dbResults = await new DataBaseBase().selectQuery<any>(sql, params)

	const results: Array<T & ISaveAbleObject> = [];

	await Promise.all(dbResults.map(async dbResult => {
		const result: T & ISaveAbleObject = new findClass();

		if (typeof dbResult[db.modelPrimary] == "bigint") {
			dbResult[db.modelPrimary] = Number(dbResult[db.modelPrimary])
		}
		result[db.modelPrimary] = dbResult[db.modelPrimary]

		for (let column in db.columns) {
			const columnOptions: ColumnOption = db.columns[column].opts
			const mapping = db.columns[column].mapping;

			let dbResultPropertyValue = dbResult[column];
			if (columnOptions.transformations) {
				const transformation: Transformations<typeof result[typeof column]> = columnOptions.transformations
				dbResultPropertyValue = await transformation.loadFromDbToProperty(dbResultPropertyValue)
			} else if (columnOptions.type == "boolean") {
				dbResultPropertyValue = dbResultPropertyValue ? true : false
			} else if (columnOptions.type == "number" && typeof dbResultPropertyValue == "bigint") {
				dbResultPropertyValue = Number(dbResultPropertyValue)
			}

			result[column] = dbResultPropertyValue;
		}

		results.push(result);
	}))


	await Promise.all(Object.keys(db.columns).map(async columnName => {
		const column: ColumnDefinition<string> = db.columns[columnName]
		const columnOptions: ColumnOption = column.opts
		const mapping = column.mapping;

		const idsToLoad: { [id: number]: Array<unknown> } = {}

		await Promise.all(results.map(async result => {
			if (mapping) {
				if (mapping.type == Mappings.OneToMany) {
					result[columnName] = [] as any;
				}
				if (shouldLoadColumn(options, columnName)) {

					//let nextOptions = nextLevelOptions(options)
					if (mapping.type == Mappings.OneToMany) {
						idsToLoad[getId(result)] ??= [];
						idsToLoad[getId(result)].push(result)
						//const items = await load<any>(mapping.target, `${mapping.column.dbTableName} = ?${additionalFilter}`, [getId(result)], { ...nextOptions, first: false }) as any;

						//result[columnName] = items

					} else if (mapping.type == Mappings.OneToOne) {
						if (result[columnName]) {
							//const targetConfig = getDBConfig(mapping.target);

							idsToLoad[result[columnName]] ??= []
							idsToLoad[result[columnName]].push(result)
							//const results = await load<any>(mapping.target, `${targetConfig.modelPrimary} = ?${additionalFilter}`, [result[columnName]], { ...nextOptions, first: true })
							//result[columnName] = results;
						}
					} else {
						throw new Error("missing mapping")
					}
				} else if (mapping.type == Mappings.OneToOne && !options.idOnNonDeepOneToOne) {
					//reset key when not loaded
					result[columnName] = null;
				}
			}
		}))


		const idArrayAndParams = Object.keys(idsToLoad);
		if (idArrayAndParams.length) {
			let additionalFilter = "";
			const idParams = new Array(idArrayAndParams.length).fill(`?`).join(",")
			if (options.deep && options.deep[columnName]) {
				let filter = options.deep[columnName]
				if (filter && filter instanceof SqlCondition) {
					filter = filter.build(idArrayAndParams)
				}
				if (typeof filter !== "string") {
					filter = filter.filter
				}
				if (filter && filter instanceof SqlCondition) {
					filter = filter.build(idArrayAndParams)
				}
				if (typeof filter !== "string") {
					throw new Error("filter not a string at adding")
				}
				additionalFilter = ` AND (${filter})`;
			}
			let nextOptions = nextLevelOptions(options)
			if (mapping.type === Mappings.OneToMany) {
				const oneToManyItems = await load<any>(mapping.target, `\`${mapping.column.dbTableName}\` IN(${idParams})${additionalFilter}`, idArrayAndParams, { ...nextOptions, first: false }) as any;

				for (const item of oneToManyItems) {
					const parentObjects = idsToLoad[item[mapping.column.dbTableName]]
					parentObjects.forEach(obj => {
						obj[columnName] = obj[columnName] || []
						obj[columnName].push(item);
					})
				}

				//result[columnName] = items
			} else if (mapping.type == Mappings.OneToOne) {
				const targetConfig = getDBConfig(mapping.target)
				const oneToOneItems = await load<any>(mapping.target, `\`${targetConfig.modelPrimary}\` IN(${idParams})${additionalFilter}`, idArrayAndParams, { ...nextOptions })

				for (const item of oneToOneItems) {
					const parentObjects = idsToLoad[item[targetConfig.modelPrimary]]
					parentObjects.forEach(obj => {
						obj[columnName] = item;
					});
				}
			} else {
				throw new Error("missing mapping")
			}
		}
	}))

	for (let result of results) {
		result.___persisted = true
		intercept(result);
	}


	if (returnAsArray(filter, options)) {
		return results;
	}
	return results[0];

}

function returnAsArray<T>(filter: string | number | SqlCondition | ((obj: T) => any), options: LoadOptions<T>) {
	if (options && options.first) {
		return false
	}
	if (typeof filter == "undefined") {
		return true
	}
	if (typeof filter == "string") {
		return true
	}
	if (typeof filter == "function") {
		return true
	}
	if (filter instanceof SqlCondition) {
		return true
	}

	return false
}


function shouldLoadColumn<T>(options: LoadOptions<T>, column: string): boolean {
	if (!options) {
		return false;
	}
	if (!options.deep) {
		return false;
	}
	if (options.deep == true) {
		return true;
	}
	if (options.deep instanceof Array) {
		return options.deep.includes(column)
	}

	const columnOptions = options.deep[column]
	if (columnOptions && typeof columnOptions !== "string" && !(columnOptions instanceof SqlCondition)) {
		return columnOptions.depths > 0
	}
	return !!columnOptions;

}

function nextLevelOptions<T>(options: LoadOptions<T>): LoadOptions<T> {
	let deepOptions = options.deep;

	if (typeof deepOptions !== "boolean" && !(deepOptions instanceof Array)) {
		deepOptions = { ...deepOptions }
		for (let i in deepOptions) {
			const columnDeepOption = deepOptions[i]
			if (typeof columnDeepOption !== "string" && !(columnDeepOption instanceof SqlCondition)) {
				deepOptions[i] = { ...columnDeepOption, depths: columnDeepOption.depths - 1 }
			}
		}
	}

	return { ...options, deep: deepOptions, first: false }
}
