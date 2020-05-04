
import { getId, getDBConfig } from './utils';
import { DataBaseBase } from './mariadb-base';
import { load } from './load';
import { ConstructorClass } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';

class Delete {

	base: DataBaseBase
	constructor() {
		this.base = new DataBaseBase()
	}

	async delete<T>(descriptor: ConstructorClass<T>, primaryId: number | Array<number>): Promise<number> {

		if (typeof primaryId === 'number') {
			primaryId = [primaryId];
		}

		const db = getDBConfig(descriptor);

		let deleteCount = 0;

		let objectToDelete: { [key: number]: T } = {};
		for (let column of db.columns) {

			const mapping = db.mappings[column];
			if (mapping) {
				const toDelete: Array<number> = []
				for (const id of primaryId) {
					if (typeof id !== "number") {
						throw "invalid primary id"
					}
					if (!objectToDelete[id]) {
						objectToDelete[id] = await load.load(descriptor, id);
					}
					if (!objectToDelete[id]) {
						throw new Error("element to delete does not exist")
					}
					if (mapping.type == Mappings.OneToMany) {
						if (objectToDelete[id][column] instanceof Array) {
							objectToDelete[id][column].forEach(subObj => {
								toDelete.push(getId(subObj))
							})
						} else {
							throw "missing implementation"
						}
					} else {
						throw "missing implementation"
					}
				}
				if (toDelete.length) {
					deleteCount += await this.delete(mapping.target, toDelete);
				}
			}
		}

		let sql = `DELETE FROM ${db.table} 
			WHERE `;

		sql += primaryId.map(id => {
			return ` ${db.primary} = ? `
		}).join(' \nOR ');

		const result = await this.base.sqlquery(sql, primaryId);
		deleteCount += result.affectedRows;
		return deleteCount;
	}
}

export const deleteObject = new Delete()
