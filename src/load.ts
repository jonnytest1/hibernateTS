
import { DataBaseBase } from './mariadb-base';
import { getId, getDBConfig } from './utils';
import { update, pushUpdate } from './update';
import { save } from './save';
import { intercept } from './intercept';
import { ConstructorClass } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';

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
			result[column] = dbResult[column];
		}
		intercept(result);

		for (let column of Object.values(db.columns)) {
			const mapping = column.mapping;
			if (mapping) {
				let obj = []
				if (deep) {
					if (mapping.type == Mappings.OneToMany) {
						obj = await load(mapping.target, mapping.column.dbName + " = ?", [getId(result)]);
					} else {
						throw new Error("missing mapping")
					}
				} else {
					const originalPush = obj.push;
					obj.push = (...items: Array<any>) => {
						items.forEach(item => {
							item[mapping.column.modelName] = getId(result)
						})
						pushUpdate(result, save(items));
						return originalPush.call(obj, ...items);
					}
				}
				Object.defineProperty(result, "_" + column.modelName, {
					value: obj,
					enumerable: false,
					writable: true
				});
			}
		}
		results.push(result);
	}

	if (typeof primaryKeyOrFilter == "string" || typeof primaryKeyOrFilter == "function") {
		return results;
	}
	return results[0];

}