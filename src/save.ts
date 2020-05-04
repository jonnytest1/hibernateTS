
import { getRepresentation, setId, getId, getDBConfig } from './utils';
import { DataBaseBase } from './mariadb-base';
import { ISaveAbleObject } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';

class Save {

	base: DataBaseBase

	constructor() {
		this.base = new DataBaseBase();
	}


	async save(saveObjects: Array<ISaveAbleObject> | ISaveAbleObject): Promise<Array<number>> {
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

		const response: any = await this.base.sqlquery(sql, params);

		for (let i = 0; i < objects.length; i++) {
			const subObj = objects[i];
			const insertId = response.insertId + i
			setId(subObj, insertId);
		}



		for (let column of db.columns) {
			const mapping = db.mappings[column];
			if (mapping) {
				const savingObjects = []
				for (const obj of objects) {
					const subObjects = obj[column];
					if (!subObjects) {
						continue;
					}
					if (mapping.type == Mappings.OneToMany && subObjects instanceof Array) {
						for (let subObj of subObjects) {
							subObj[mapping.column] = getId(obj);
						}
						savingObjects.push(...subObjects)

					} else {
						throw new Error("missing implementation")
					}
				}
				if (savingObjects.length > 0) {
					await this.save(savingObjects);
				}


			}
		}

		return objects.map(obj => getId(obj));
	}
}

export const save = new Save()