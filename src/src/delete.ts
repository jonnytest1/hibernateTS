
import { getId, getDBConfig } from './utils';
import { DataBaseBase } from './mariadb-base';
import { load } from './load';
import { Mappings } from './interface/mapping-types';
import { ConstructorClass } from './interface/mapping';
import { remove } from '.';
import { primary } from './annotations/database-annotation';


export interface DeleteOptions {
	deep?: boolean | Array<string>;
}
export async function deleteFnc<T>(object: any, opts?: DeleteOptions): Promise<number>
export async function deleteFnc<T>(descriptor: ConstructorClass<T>, primaryId: number | Array<number>, opts?: DeleteOptions): Promise<number>
export async function deleteFnc<T>(descriptor: ConstructorClass<T> | any, primaryId?: number | Array<number> | DeleteOptions, opts: DeleteOptions = {}): Promise<number> {

	const db = getDBConfig(descriptor);
	let dletionId: Array<number> = primaryId as Array<number>

	if (!primaryId) {
		dletionId = descriptor[db.modelPrimary];
		descriptor = descriptor.constructor
	}

	if (typeof primaryId == "object" && !(primaryId instanceof Array)) {
		opts = primaryId;
		primaryId = undefined
	}


	if (typeof primaryId === 'number') {
		dletionId = [primaryId];
	}



	let deleteCount = 0;

	let objectToDelete: { [key: number]: T } = {};
	for (let column of Object.values(db.columns)) {

		const mapping = column.mapping;
		if (mapping) {
			const toDelete: Array<number> = []
			for (const id of dletionId) {
				if (typeof id !== "number") {
					throw "invalid primary id"
				}
				if (!objectToDelete[id]) {
					objectToDelete[id] = await load(descriptor, id);
				}
				if (!objectToDelete[id]) {
					throw new Error("element to delete does not exist")
				}

				switch (mapping.type) {
					case Mappings.OneToMany:
						if (objectToDelete[id][column.modelName] instanceof Array) {
							objectToDelete[id][column.modelName].forEach(subObj => {
								if (opts.deep == true || (opts.deep && (opts.deep instanceof Array) && opts.deep.includes(column.modelName))) {
									toDelete.push(getId(subObj))
								}
							})
						} else {
							throw "missing implementation"
						}
						break;
					case Mappings.OneToOne:
						if (opts.deep || (opts.deep && (opts.deep instanceof Array) && opts.deep.includes(column.modelName))) {
							toDelete.push(getId(objectToDelete[id]))
						}

						break;
					default:
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

	sql += dletionId.map(id => {
		return ` ${db.modelPrimary} = ? `
	}).join(' \nOR ');

	const result = await new DataBaseBase().sqlquery(sql, dletionId);
	deleteCount += result.affectedRows;
	return deleteCount;
}