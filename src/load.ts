
import { DataBaseBase } from './mariadb-base';
import { getId, getDBConfig } from './utils';
import { update, pushUpdate } from './update';
import { save } from './save';
import { intercept } from './intercept';
import { Mappings } from './interface/mapping-types';
import { ConstructorClass } from './interface/mapping';

export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: number, parameters?: Array<string | number> | string, deep?: boolean): Promise<T>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any, parameters?: undefined, deep?: boolean): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string, parameters?: Array<string | number> | string, deep?: boolean): Promise<Array<T>>;
export async function load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string | number | ((obj: T) => any), parameters: Array<string | number> | string = [], deep: boolean = true): Promise<T | Array<T>> {
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
					sql += column.dbName + " = ?";
					params.push(value)
				} else {
					throw new Error("invalid value")
				}
				return `${column.dbName} = ?`
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

	for (const dbResult of dbResults) {
		const result: T = new findClass();

		for (let column in db.columns) {
			const mapping = db.columns[column].mapping;

			result[column] = dbResult[column];

			if (mapping) {
				result[column] = [];
				if (deep) {
					if (mapping.type == Mappings.OneToMany) {
						result[column] = await load(mapping.target, mapping.column.dbName + " = ?", [getId(result)]);
					} else {
						throw new Error("missing mapping")
					}
				}
			}
		}
		intercept(result);
		results.push(result);
	}

	if (typeof primaryKeyOrFilter == "string" || typeof primaryKeyOrFilter == "function") {
		return results;
	}
	return results[0];

}