
import { DataBaseBase } from './mariadb-base';
import { getId, getDBConfig } from './utils';
import { update } from './update';
import { save } from './save';
import { intercept } from './intercept';
import { ConstructorClass } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';

class Load {
	base: DataBaseBase;

	constructor() {
		this.base = new DataBaseBase()
	}

	public async load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: number, parameters?: Array<string | number> | string, deep?: boolean): Promise<T>;
	public async load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: (obj: T) => any, parameters?: undefined, deep?: boolean): Promise<Array<T>>;
	public async load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string, parameters?: Array<string | number> | string, deep?: boolean): Promise<Array<T>>;
	public async load<T>(findClass: ConstructorClass<T>, primaryKeyOrFilter: string | number | ((obj: T) => any), parameters: Array<string | number> | string = [], deep: boolean = true): Promise<T | Array<T>> {
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
			for (let column of db.columns) {
				tempObj[column] = column;
			}
			primaryKeyOrFilter(tempObj);

			const previousLength = params.length;
			sql += db.columns
				.filter(column => tempObj[column] !== column)
				.map(column => {
					const value = tempObj[column]
					if (value !== undefined) {
						sql += column + " = ?";
						params.push(value)
					} else {
						throw new Error("invalid value")
					}
					return `${column} = ?`
				})
				.join(' \nAND ');

			if (previousLength === params.length) {
				throw new Error("missing filter");
			}
		} else {
			sql += db.primary + " = ?";
			params.push(primaryKeyOrFilter)
		}

		const dbResults = await this.base.selectQuery<any>(sql, params)

		const results: Array<T> = [];

		for (const dbResult of dbResults) {
			const result: T = new findClass();

			for (let column of db.columns) {
				result[column] = dbResult[column];
			}
			intercept.intercept(result);

			for (let column of db.columns) {
				const mapping = db.mappings[column];
				if (mapping) {
					let obj = []
					if (deep) {
						if (mapping.type == Mappings.OneToMany) {
							obj = await this.load(mapping.target, mapping.column + " = ?", [getId(result)]);
						} else {
							throw new Error("missing mapping")
						}
					} else {
						const originalPush = obj.push;
						obj.push = (...items: Array<any>) => {
							items.forEach(item => {
								item[mapping.column] = getId(result)
							})
							update.pushUpdate(result, save.save(items));
							return originalPush.call(obj, ...items);
						}
					}
					Object.defineProperty(result, "_" + column, {
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
}

export const load = new Load();