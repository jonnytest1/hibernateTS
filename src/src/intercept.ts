
import { update, pushUpdate } from './update';
import { Mappings } from './interface/mapping-types';
import { getDBConfig, getId } from './utils';
import { ISaveAbleObject } from './interface/mapping';
import { save } from '.';
import { DataBaseBase } from './mariadb-base';
import { ColumnOption, DBColumn } from './annotations/database-annotation';
import { ColumnDefinition } from './annotations/database-config';

export function intercept<T>(object: ISaveAbleObject) {

	if (Object.getOwnPropertyDescriptor(object, "_dbUpdates")) {
		return
	}

	Object.defineProperty(object, "_dbUpdates", {
		enumerable: false,
		value: [],
		configurable: false
	});

	const db = getDBConfig<any>(object);

	for (let col of Object.values(db.columns)) {
		let column = col as ColumnDefinition<keyof typeof object>
		Object.defineProperty(object, "_" + column.modelName, {
			value: object[column.modelName],
			writable: true,
			enumerable: false
		});

		const overwrites: PropertyDescriptor & ThisType<any> = {
			get: () => {
				return object["_" + column.modelName];
			},
			configurable: true,
			enumerable: true
		};
		if (column.modelName !== db.modelPrimary) {
			const mapping = column.mapping;
			overwrites.set = (value) => {
				let hasSaved = false;
				if (mapping) {
					if (mapping.type === Mappings.OneToMany) {
						if (value instanceof Array) {
							value = value.map(val => {
								if (val instanceof mapping.target) {
									return val;
								} else {
									const newVal = new mapping.target();
									for (let i in val) {
										newVal[i] = val[i];
									}
									return newVal;
								}
							})
						} else {
							throw "wrong type for mapping"
						}
					} else if (mapping.type == Mappings.OneToOne) {
						if (!(value instanceof mapping.target)) {
							const newVal = new mapping.target();
							for (let i in value) {
								newVal[i] = value[i];
							}
							value = newVal;
						}
						hasSaved = true;
						pushUpdate(object, save(value).then(async primaryKey => {
							const sql = "UPDATE " + db.table + " SET " + column.dbTableName + " = ? WHERE " + db.modelPrimary + " = ?";
							const deleteResult = await new DataBaseBase().sqlquery(sql, [primaryKey[0], getId(object)])
						}))
						intercept(value);

					} else {
						throw "unimplemented "
					}
				}
				object["_" + column.modelName] = value;
				Object.defineProperty(object, column.modelName, overwrites);
				if (!hasSaved) {
					pushUpdate(object, update(object, column.modelName, value))
				}
			}
			interceptArray(object, column.modelName)
		} else {
			overwrites.set = (value) => {
				throw "dont set primary"
			}
		}
		Object.defineProperty(object, column.modelName, overwrites);
	}
}

function interceptArray(object: ISaveAbleObject, column: string) {
	const mapping = getDBConfig(object).columns[column].mapping;
	const obj = object[column];
	if (mapping && obj instanceof Array) {
		obj.push = new Proxy(obj.push, {
			apply: (target, thisArg, items) => {
				items.forEach(item => {
					item[mapping.column.modelName] = getId(object)
				})
				pushUpdate(object, save(items));
				return target.call(obj, ...items);
			}
		})
	}


}