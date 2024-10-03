
import { getRepresentation, setId, getId, getDBConfig, isPersisted } from './utils';
import { MariaDbBase } from './dbs/mariadb-base';
import { Mappings } from './interface/mapping-types';
import { Mapping, ISaveAbleObject } from './interface/mapping';
import { ColumnOption } from './annotations/database-annotation';
import { ExtendedMap } from './extended-map/extended-map';
import type { DataBaseBase } from './dbs/database-base';

interface SaveOptions {
	/**
	 * update all not primary keys if it already exists defaults to false
	 */
	updateOnDuplicate?: boolean

	db?: DataBaseBase
}

export async function save(saveObjects: Array<ISaveAbleObject> | ISaveAbleObject, options: SaveOptions = {}): Promise<Array<number>> {
	let objects: Array<ISaveAbleObject>;
	if (!(saveObjects instanceof Array)) {
		objects = [saveObjects];
	} else {
		objects = saveObjects;
	}
	if (objects.length == 0) {
		return [];
	}

	const db = getDBConfig(objects[0]);

	if (!db.table) {
		throw "missing table";
	}
	const initializePool = !options.db
	if (initializePool) {
		options.db = new MariaDbBase()
	}

	try {
		let sql = "INSERT INTO `" + db.table + "` ("

		sql += Object.keys(getRepresentation(objects[0])).join(",");

		sql += ") VALUES";

		const params = [];

		const sqlArray = []


		for (let obj of objects) {
			const saveableobject = obj;
			let representation = getRepresentation(saveableobject);

			for (let key in representation) {
				const value = representation[key];
				const dbKey = key.replace(/(^`)/g, "").replace(/(`$)/g, "") as keyof typeof obj
				if (value === undefined) {
					params.push(null);
					continue
				}
				if (db.columns[dbKey].opts && "transformations" in db.columns[dbKey].opts) {
					const columnOptions: ColumnOption = db.columns[dbKey].opts as ColumnOption
					if (columnOptions.transformations) {
						params.push(await columnOptions.transformations.saveFromPropertyToDb(value))
						continue
					}
				}
				params.push(value);

			}

			sqlArray.push(`( ${Object.keys(representation).map(key => '?').join(",")} )`)
		}


		sql += sqlArray.join(',')

		if (options.updateOnDuplicate) {
			sql += ' ON DUPLICATE KEY UPDATE ' + Object.keys(getRepresentation(objects[0]))
				.map(key => `${key} = VALUES(${key})`).join(",")
		}

		const response = await options.db.sqlquery(sql, params);

		for (let i = 0; i < objects.length; i++) {
			if (db.columns[db.modelPrimary].primaryType == "auto-increment") {
				const subObj = objects[i];
				const insertId = Number(response.insertId) + i
				setId(subObj, insertId);
			}
			objects[i].___persisted = true
		}



		for (let column of Object.values(db.columns)) {
			const mapping: Mapping<Mappings> = column.mapping;
			if (mapping) {
				const savingObjects: Array<{ parent?: any, subobject: any }> = []
				for (const obj of objects) {
					let subObjects = obj[column.modelName];
					if (!subObjects) {
						continue;
					}
					if (mapping.type == Mappings.OneToMany) {
						if (!(subObjects instanceof Array)) {
							if (subObjects instanceof ExtendedMap) {
								subObjects = subObjects.__getItemRef()
							} else {
								throw new Error("missing implementation")
							}
						}
						for (let subObj of subObjects) {
							subObj[mapping.column.modelName] = getId(obj);
						}
						savingObjects.push(...subObjects.map(o => ({ subobject: o })))

					} else if (mapping.type == Mappings.OneToOne) {
						if (!isPersisted(subObjects)) {
							savingObjects.push({ subobject: subObjects, parent: obj })
						}
					} else {
						throw new Error("missing implementation")
					}
				}
				if (savingObjects.length > 0) {
					const ids = await save(savingObjects.filter(obj => !isPersisted(obj.subobject)).map(o => o.subobject), { db: options.db });
					if (mapping.type == Mappings.OneToOne) {
						const sql = "UPDATE `" + db.table + "` SET `" + column.dbTableName + "` = ? WHERE " + db.modelPrimary + " = ?";
						const deleteResult = await options.db.sqlquery(sql, [ids[0], getId(savingObjects[0].parent)])
					}
				}


			}
		}

		return objects.map(obj => getId(obj));
	} finally {
		if (initializePool) {
			options.db.end()
		}
	}
}