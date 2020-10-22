
import { DataBaseBase } from './mariadb-base';
import { getId, getDBConfig, CustomOmit } from './utils';
import { update, pushUpdate } from './update';
import { save } from './save';
import { intercept } from './intercept';
import { Mappings } from './interface/mapping-types';
import { ConstructorClass } from './interface/mapping';

export interface LoadOptions {
	deep?: boolean,
	first?: boolean
}


export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any, parameters: undefined | undefined[], options: { first: true } & CustomOmit<LoadOptions, "first">): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string, parameters: Array<string | number> | string, options: { first: true } & CustomOmit<LoadOptions, "first">): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: number, parameters?: Array<string | number> | string, options?: LoadOptions): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any, parameters?: undefined | undefined[], options?: LoadOptions): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string, parameters?: Array<string | number> | string, options?: LoadOptions): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string | number | ((obj: T) => any), parameters: Array<string | number> | string = [], options: LoadOptions = {}): Promise<T | Array<T>> {
	const db = getDBConfig(findClass);
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
			tempObj[column] = column;
		}
		primaryKeyOrFilter(tempObj);

		const previousLength = params.length;
		sql += Object.values(db.columns)
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
					result[column] = [];
				}

				if (options && options.deep) {
					if (mapping.type == Mappings.OneToMany) {
						result[column] = await load(mapping.target, mapping.column.dbTableName + " = ?", [getId(result)], options);
					} else if (mapping.type == Mappings.OneToOne) {
						if (dbResult[column]) {
							const targetConfig = getDBConfig(mapping.target);
							const results = await load(mapping.target, targetConfig.modelPrimary + " = ?", [dbResult[column]], options)
							result[column] = results[0];
						}
					} else {
						throw new Error("missing mapping")
					}
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