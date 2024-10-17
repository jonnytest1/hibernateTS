
import { getId, getDBConfig } from './utils';
import { MariaDbBase } from './dbs/mariadb-base';
import { load } from './load';
import { Mappings } from './interface/mapping-types';
import { ConstructorClass } from './interface/mapping';
import type { DataBaseBase } from './dbs/database-base';


export interface DeleteOptions {
	deep?: boolean | Array<string>;

	db?: DataBaseBase
}
export async function deleteFnc<T>(object: any, opts?: DeleteOptions): Promise<number>
export async function deleteFnc<T>(descriptor: ConstructorClass<T>, primaryId: number | Array<number>, opts?: DeleteOptions): Promise<number>
export async function deleteFnc<T>(descriptor: ConstructorClass<T> | any, primaryId?: number | Array<number> | DeleteOptions, opts: DeleteOptions = {}): Promise<number> {

	const db = getDBConfig(descriptor);
	let dletionId: Array<number> = primaryId as Array<number>

	if (!primaryId) {
		dletionId = [descriptor[db.modelPrimary]];
		descriptor = descriptor.constructor
	}

	if (typeof primaryId == "object" && !(primaryId instanceof Array)) {
		opts = primaryId;
		primaryId = getId(descriptor);
		descriptor = descriptor.constructor
	}

	if (typeof primaryId === 'number') {
		dletionId = [primaryId];
	}

	const createDb = !opts.db;
	if (createDb) {
		opts.db = new MariaDbBase()
	}
	const pool = opts.db!
	try {
		let deleteCount = 0;

		let objectToDelete: { [key: number]: T } = {};
		for (let column of Object.values(db.columns)) {

			const mapping = column?.mapping;
			if (mapping) {
				const toDelete: Array<number> = []
				for (const id of dletionId) {
					if (typeof id !== "number") {
						if (typeof id == "string") {
							objectToDelete[id] = await load(descriptor, `\`${db.columns[db.modelPrimary]!.dbTableName}\` = ?`, [id], { deep: opts.deep, first: true, db: opts.db });
							if (!objectToDelete[id]) {
								throw new Error("element to delete does not exist")
							}
						} else {
							throw "invalid primary id"
						}
					}
					if (!objectToDelete[id]) {
						objectToDelete[id] = await load(descriptor, id, undefined, { deep: opts.deep, db: opts.db });
					}
					if (!objectToDelete[id]) {
						throw new Error("element to delete does not exist")
					}

					const deletingObject = objectToDelete[id][column!.modelName];
					switch (mapping.type) {
						case Mappings.OneToMany:
							if (deletingObject instanceof Array) {
								deletingObject.forEach(subObj => {
									if (opts.deep === true || (opts.deep && (opts.deep instanceof Array) && opts.deep.includes(column!.modelName))) {
										toDelete.push(getId(subObj))
									}
								})
							} else {
								throw "missing implementation"
							}
							break;
						case Mappings.OneToOne:
							if (deletingObject && (opts.deep === true || (opts.deep && (opts.deep instanceof Array) && opts.deep.includes(column!.modelName)))) {
								toDelete.push(getId(deletingObject))
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

		let sql = `DELETE FROM \`${db.table}\` 
		WHERE `;

		sql += dletionId.map(id => {
			return ` ${db.modelPrimary} = ? `
		}).join(' \nOR ');

		const result = await pool.sqlquery(sql, dletionId);
		deleteCount += result.affectedRows;
		return deleteCount;
	} finally {
		if (createDb) {
			opts.db?.end()
		}
	}
}