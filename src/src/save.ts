
import { getRepresentation, setId, getId, getDBConfig } from './utils';
import { DataBaseBase } from './mariadb-base';
import { Mappings } from './interface/mapping-types';
import { Mapping, ISaveAbleObject } from './interface/mapping';

interface SaveOptions {
	/**
	 * update all not primary keys if it already exists defaults to false
	 */
	updateOnDuplicate?: boolean
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


	let sql = "INSERT INTO `" + db.table + "` ("

	sql += Object.keys(getRepresentation(objects[0])).join(",");

	sql += ") VALUES";

	const params = [];


	sql += objects.map(obj => {
		const saveableobject = obj;
		let representation = getRepresentation(saveableobject);

		params.push(...Object.values(representation).map(value => value === undefined ? null : value));
		return `( ${Object.keys(representation).map(key => '?').join(",")} )`;
	}).join(',')

	if (options.updateOnDuplicate) {
		sql += ' ON DUPLICATE KEY UPDATE ' + Object.keys(getRepresentation(objects[0]))
			.map(key => `${key} = VALUES(${key})`).join(",")
	}

	const response: any = await new DataBaseBase().sqlquery(sql, params);

	for (let i = 0; i < objects.length; i++) {
		if (db.columns[db.modelPrimary].primaryType == "auto-increment") {
			const subObj = objects[i];
			const insertId = response.insertId + i
			setId(subObj, insertId);
		}
	}



	for (let column of Object.values(db.columns)) {
		const mapping: Mapping = column.mapping;
		if (mapping) {
			const savingObjects = []
			for (const obj of objects) {
				const subObjects = obj[column.modelName];
				if (!subObjects) {
					continue;
				}
				if (mapping.type == Mappings.OneToMany && subObjects instanceof Array) {
					for (let subObj of subObjects) {
						subObj[mapping.column.modelName] = getId(obj);
					}
					savingObjects.push(...subObjects)

				} else if (mapping.type == Mappings.OneToOne) {
					savingObjects.push(subObjects)
				} else {
					throw new Error("missing implementation")
				}
			}
			if (savingObjects.length > 0) {
				await save(savingObjects);
			}


		}
	}

	return objects.map(obj => getId(obj));
}