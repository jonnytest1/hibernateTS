
import { DataBaseBase } from './mariadb-base';
import { getId, getDBConfig, CustomOmit, shouldAddColumn } from './utils';
import { update, pushUpdate } from './update';
import { save } from './save';
import { intercept } from './intercept';
import { Mappings } from './interface/mapping-types';
import { ConstructorClass } from './interface/mapping';

export interface LoadOptions<T> {
	deep?: boolean | Array<string> | { [key: string]: string },
	first?: boolean
}


export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any, parameters: undefined | undefined[], options: { first: true } & CustomOmit<LoadOptions<T>, "first">): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string, parameters: Array<string | number> | string, options: { first: true } & CustomOmit<LoadOptions<T>, "first">): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: number, parameters?: Array<string | number> | string, options?: LoadOptions<T>): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any, parameters?: undefined | undefined[], options?: LoadOptions<T>): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string, parameters?: Array<string | number> | string, options?: LoadOptions<T>): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string | number | ((obj: T) => any), parameters: Array<string | number> | string = [], options: LoadOptions<T> = {}): Promise<T | Array<T>> {
	const db = getDBConfig<T>(findClass);
	let sql = "SELECT * FROM " + db.table + " ";

	sql += "WHERE ";

	let params: Array<string | number> = [];
	if (typeof primaryKeyOrFilter == "string") {
		sql += primaryKeyOrFilter;

		if (typeof parameters === "string") {
			parameters = [parameters];
		}

		parameters.forEach(param => {
			params.push(param)
		});
	} else if (typeof primaryKeyOrFilter === "function") {
		// format :  s => s.id = +req.params.id
		const tempObj = new findClass();
		for (let column in db.columns) {
			tempObj[column] = column as any;
		}
		primaryKeyOrFilter(tempObj);

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
				return `${column.dbTableName} = ?`
			})
			.join(' \nAND ');

		if (previousLength === params.length) {
			throw new Error("missing filter");
		}
	} else {
		sql += db.modelPrimary + " = ?";
		params.push(primaryKeyOrFilter)
	}

	const dbResults = await new DataBaseBase().selectQuery<any>(sql, params)

	const results: Array<T> = [];

	await Promise.all(dbResults.map(async dbResult => {
		const result: T = new findClass();

		result[db.modelPrimary] = dbResult[db.modelPrimary]

		for (let column in db.columns) {
			const mapping = db.columns[column].mapping;

			result[column] = dbResult[column];

			if (mapping) {
				if (mapping.type == Mappings.OneToMany) {
					result[column] = [] as any;
				}
				if (shouldLoadColumn(options, column)) {
					let additionalFilter = "";
					if (options.deep && options.deep[column as string]) {
						additionalFilter = " AND " + options.deep[column as string];
					}

					if (mapping.type == Mappings.OneToMany) {
						result[column] = await load<any>(mapping.target, `${mapping.column.dbTableName} = ?${additionalFilter}`, [getId(result)], { ...options, first: false }) as any;
					} else if (mapping.type == Mappings.OneToOne) {
						if (dbResult[column]) {
							const targetConfig = getDBConfig(mapping.target);
							const results = await load<any>(mapping.target, `${targetConfig.modelPrimary} = ?${additionalFilter}`, [dbResult[column]], { ...options, first: true })
							result[column] = results;
						}
					} else {
						throw new Error("missing mapping")
					}
				} else if (mapping.type == Mappings.OneToOne) {
					//reset key when not loaded
					result[column] = null;
				}
			}
		}
		intercept(result);
		results.push(result);
	}))
	if ((typeof primaryKeyOrFilter == "string" || typeof primaryKeyOrFilter == "function") && !(options && options.first)) {
		return results;
	}
	return results[0];

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

	return !!options.deep[column];

}