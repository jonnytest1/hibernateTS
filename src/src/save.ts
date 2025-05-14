
import { getRepresentation, setId, getId, getDBConfig, isPersisted } from './utils';
import { MariaDbBase } from './dbs/mariadb-base';
import { Mappings } from './interface/mapping-types';
import { Mapping, ISaveAbleObject } from './interface/mapping';
import { ColumnOption } from './annotations/database-annotation';
import { ExtendedMap } from './extended-map/extended-map';
import type { DataBaseBase } from './dbs/database-base';
import { pushUpdate } from './update';

interface SaveOptions<T> {
	/**
	 * update all not primary keys if it already exists defaults to false
	 */
	updateOnDuplicate?: boolean | {
		skip?: Array<keyof T & string>
	}

	db?: DataBaseBase
}


export async function save<T extends ISaveAbleObject>(saveObjects: Array<T> | T, options: SaveOptions<T> = {}): Promise<Array<number>> {
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
	const pool = options.db!

	try {
		let sql = "INSERT INTO `" + db.table + "` ("

		sql += Object.keys(getRepresentation(objects[0])).join(",");

		sql += ") VALUES";

		const params: Array<unknown> = [];

		const sqlArray: Array<string> = []


		for (let obj of objects) {
			const saveableobject = obj;
			let representation = getRepresentation(saveableobject);

			for (let key in representation) {
				let value = representation[key];
				const dbKey = key.replace(/(^`)/g, "").replace(/(`$)/g, "") as keyof typeof obj
				if (value === undefined) {
					params.push(null);
					continue
				}
				const columnDef = db.columns[dbKey]!;
				if (columnDef?.opts && "transformations" in columnDef.opts) {
					const columnOptions: ColumnOption = columnDef.opts as ColumnOption
					if (columnOptions.transformations) {
						params.push(await columnOptions.transformations.saveFromPropertyToDb(value))
						continue
					}
				}
				if (options.db?.constructor.queryStrings?.convertValue) {
					value = options.db.constructor.queryStrings.convertValue(value, columnDef)
				}

				params.push(value);

			}

			sqlArray.push(`( ${Object.keys(representation).map(key => '?').join(",")} )`)
		}


		sql += sqlArray.join(',')

		if (options.updateOnDuplicate) {

			let keys = Object.keys(getRepresentation(objects[0]));

			if (typeof options.updateOnDuplicate === "object" && options.updateOnDuplicate.skip) {
				options.updateOnDuplicate.skip.forEach(key => {
					keys = keys.filter(k => k !== key)
				})

			}
			sql += options.db?.constructor.queryStrings.duplicateKeyUpdate(keys, db)

		}

		if (pool.constructor.queryStrings?.insertQuery) {
			sql = pool.constructor.queryStrings.insertQuery(sql, db)
		}

		const response = await pool.sqlquery(db, sql, params);

		for (let i = 0; i < objects.length; i++) {
			if (db.modelPrimary && db.columns[db.modelPrimary]?.primaryType == "auto-increment") {
				const subObj = objects[i];
				const insertId = Number(response.insertId) + i
				setId(subObj, insertId);
			}
			objects[i].___persisted = true
		}



		for (let column of Object.values(db.columns)) {
			const mapping: Mapping<Mappings> | undefined = column.mapping;
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
						const deleteResult = await pool.sqlquery(db, sql, [ids[0], getId(savingObjects[0].parent)])
					}
				}


			}
		}

		return objects.map(obj => getId(obj));
	} finally {
		if (initializePool) {
			options.db?.end()
		}
	}
}



interface AddArrayOpts<T> {
	db: DataBaseBase, items: Array<T>
}

type ArrayKeys<T> = {
	[K in keyof T]: T[K] extends Array<infer U> ? K : never
}[keyof T]

type ArrayType<T, K extends keyof T> = T[K] extends Array<infer U> ? U : never
type AnyToNever<T, K extends keyof T> = T[K] extends Array<infer U> ? U : never

export function addArrayItem<T extends ISaveAbleObject, K extends ArrayKeys<T>>(parent: T, key: K, opts: Array<ArrayType<T, K> & ISaveAbleObject> | AddArrayOpts<ArrayType<T, K> & ISaveAbleObject>) {
	const mapping = getDBConfig(parent).columns[key]?.mapping;
	if (!mapping) {
		throw new Error("no mapping found for object")
	}

	let items: Array<ArrayType<T, K> & ISaveAbleObject>
	let saveOpts: SaveOptions<ArrayType<T, K> & ISaveAbleObject> = {}
	if (opts instanceof Array) {
		items = opts
	} else {
		items = opts.items
		saveOpts = opts
	}


	items.forEach(item => {
		item[mapping.column.modelName] = getId(parent)
	})
	pushUpdate(parent, save(items, saveOpts));
}