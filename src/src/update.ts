
import { MariaDbBase } from './dbs/mariadb-base';
import { save } from './save';
import { getId, getDBConfig } from './utils';
import { Mappings } from './interface/mapping-types';
import { ISaveAbleObject } from './interface/mapping';
import { ColumnOption } from './annotations/database-annotation';
import type { DataBaseBase } from './dbs/database-base';

export function pushUpdate(obj: ISaveAbleObject, update: Promise<any>): void {
	obj["_dbUpdates"].push(update)
}


export type UpdateOptions = {
	db?: DataBaseBase
}

export async function update(object: ISaveAbleObject, key: keyof typeof object, value: string | number | Array<ISaveAbleObject>, opts: UpdateOptions = {}) {
	const db = getDBConfig(object);

	const columnDef = db.columns[key];
	const mapping = columnDef?.mapping;

	if (columnDef?.opts && "transformations" in columnDef.opts) {
		const options = columnDef.opts as ColumnOption

		value = await options.transformations?.saveFromPropertyToDb(value)

	}



	let initialized = false
	if (!opts.db) {
		opts.db = new MariaDbBase()
		initialized = true
	}

	const dbBase = opts.db

	if (dbBase.constructor.queryStrings.convertValue && columnDef) {
		value = dbBase.constructor.queryStrings.convertValue(value, columnDef)
	}
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
		if (initialized) {
			dbBase.end()
		}
	}
}