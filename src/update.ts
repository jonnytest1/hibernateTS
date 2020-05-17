
import { DataBaseBase } from './mariadb-base';
import { save } from './save';
import { getId, getDBConfig } from './utils';
import { ISaveAbleObject } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';

export function pushUpdate(obj: ISaveAbleObject, update: Promise<any>): void {
	obj["_dbUpdates"].push(update)
}

export async function update(object: ISaveAbleObject, key: string, value: string | number | Array<ISaveAbleObject>) {
	const db = getDBConfig(object);

	const mapping = db.columns[key].mapping;
	if (mapping) {
		if (mapping.type == Mappings.OneToMany) {
			if (value instanceof Array) {
				const childDb = getDBConfig(mapping.target)
				const deleteResult = await new DataBaseBase().sqlquery("DELETE FROM " + childDb.table + " WHERE " + mapping.column.dbName + " = ?", [getId(object)])
				if (value.length > 0) {
					const insertResults = await save(value.map(childValue => {
						childValue[mapping.column.modelName] = getId(object);
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
		const sql = "UPDATE " + db.table + " SET " + key + " = ? WHERE " + db.modelPrimary + " = ?";
		const updateResult = await new DataBaseBase().sqlquery(sql, [value, getId(object)]);
		return updateResult.affectedRows
	}
}