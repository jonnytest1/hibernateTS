
import { DataBaseBase } from './mariadb-base';
import { save } from './save';
import { getId, getDBConfig } from './utils';
import { ISaveAbleObject } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';

class Update {

	base: DataBaseBase

	constructor() {
		this.base = new DataBaseBase()
	}

	pushUpdate(obj: ISaveAbleObject, update: Promise<any>): void {
		obj["_dbUpdates"].push(update)
	}

	async update(object: ISaveAbleObject, key: string, value: string | number | Array<ISaveAbleObject>) {
		const db = getDBConfig(object);

		const mapping = db.mappings[key];
		if (mapping) {
			if (mapping.type == Mappings.OneToMany) {
				if (value instanceof Array) {
					const childDb = getDBConfig(mapping.target)
					const deleteResult = await this.base.sqlquery("DELETE FROM " + childDb.table + " WHERE " + mapping.column + " = ?", [getId(object)])
					if (value.length > 0) {
						const insertResults = await save.save(value.map(childValue => {
							childValue[mapping.column] = getId(object);
							return childValue;
						}));

						return insertResults.length + deleteResult.affectedRows
					}
					return deleteResult.affectedRows;
				} else {
					throw new Error("missing implementation no array for mapping")
				}
			} else {
				throw new Error("missing implementation differnent mapping")
			}
		} else {
			const sql = "UPDATE " + db.table + " SET " + key + " = ? WHERE " + db.primary + " = ?";
			const updateResult = await this.base.sqlquery(sql, [value, getId(object)]);
			return updateResult.affectedRows
		}
	}

}


export const update = new Update();