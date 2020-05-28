
import { getId, getDBConfig } from './utils';
import { DataBaseBase } from './mariadb-base';
import { load } from './load';
import { Mappings } from './interface/mapping-types';
import { ConstructorClass } from './interface/mapping';

export async function deleteFnc<T>(descriptor: ConstructorClass<T>, primaryId: number | Array<number>): Promise<number> {

	if (typeof primaryId === 'number') {
		primaryId = [primaryId];
	}

	const db = getDBConfig(descriptor);

	let deleteCount = 0;

	let objectToDelete: { [key: number]: T } = {};
	for (let column of Object.values(db.columns)) {

		const mapping = column.mapping;
		if (mapping) {
			const toDelete: Array<number> = []
			for (const id of primaryId) {
				if (typeof id !== "number") {
					throw "invalid primary id"
				}
				if (!objectToDelete[id]) {
					objectToDelete[id] = await load(descriptor, id);
				}
				if (!objectToDelete[id]) {
					throw new Error("element to delete does not exist")
				}
				if (mapping.type == Mappings.OneToMany) {
					if (objectToDelete[id][column.modelName] instanceof Array) {
						objectToDelete[id][column.modelName].forEach(subObj => {
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
				deleteCount += await deleteFnc(mapping.target, toDelete);
			}
		}
	}

	let sql = `DELETE FROM ${db.table} 
		WHERE `;

	sql += primaryId.map(id => {
		return ` ${db.modelPrimary} = ? `
	}).join(' \nOR ');

	const result = await new DataBaseBase().sqlquery(sql, primaryId);
	deleteCount += result.affectedRows;
	return deleteCount;
}