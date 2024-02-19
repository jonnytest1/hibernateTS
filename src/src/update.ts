
import { DataBaseBase } from './mariadb-base';
import { save } from './save';
import { getId, getDBConfig } from './utils';
import { Mappings } from './interface/mapping-types';
import { ISaveAbleObject } from './interface/mapping';
import { ColumnOption, Transformations } from './annotations/database-annotation';

export function pushUpdate(obj: ISaveAbleObject, update: Promise<any>): void {
	obj["_dbUpdates"].push(update)
}

export async function update(object: ISaveAbleObject, key: keyof typeof object, value: string | number | Array<ISaveAbleObject>) {
	const db = getDBConfig(object);

	const mapping = db.columns[key].mapping;

	if (db.columns[key].opts && "transformations" in db.columns[key].opts) {
		const options: ColumnOption = db.columns[key].opts

		value = await options.transformations.saveFromPropertyToDb(value)

	}
	const dbBase = new DataBaseBase()
	try {
		if (mapping) {
			if (mapping.type == Mappings.OneToMany) {
				if (value instanceof Array) {
					const childDb = getDBConfig(mapping.target)
					const deleteResult = await dbBase.sqlquery("DELETE FROM `" + childDb.table + "` WHERE " + mapping.column.dbTableName + " = ?", [getId(object)])
					if (value.length > 0) {
						const insertResults = await save(value.map(childValue => {
							childValue[mapping.column.modelName] = getId(object);
							return childValue;
						}), { db: dbBase });
						return insertResults.length + deleteResult.affectedRows
					}
					return deleteResult.affectedRows;
				} else {
					throw new Error("missing implementation no array for mapping")
				}
			} else if (mapping.type == Mappings.OneToOne) {
				const childDb = getDBConfig(mapping.target)
				const deleteResult = await dbBase.sqlquery("DELETE FROM `" + childDb.table + "` WHERE " + mapping.column.dbTableName + " = ?", [getId(object)])
				value[mapping.column.modelName] = getId(object);
				const insertResults = await save(value, { db: dbBase })
				return insertResults[0]
			} else {
				throw new Error("missing implementation differnent mapping")
			}
		} else {
			const sql = "UPDATE `" + db.table + "` SET " + key + " = ? WHERE " + db.modelPrimary + " = ?";
			const updateResult = await dbBase.sqlquery(sql, [value, getId(object)]);
			return updateResult.affectedRows
		}
	} finally {
		dbBase.end()
	}
}