import { updateDatabase } from './db';

export { load } from "./load"
export { deleteFnc as remove } from './delete';
export { intercept } from './intercept';
export { save } from './save';
export { Mappings } from './interface/mapping-types';
export * from "./annotations/database-annotation"
export { updateDatabase } from "./db"

export async function queries(object: any): Promise<Array<number>> {
	const updates: Array<Promise<number>> = object["_dbUpdates"] || [];
	const finishedUpdates = await Promise.all(updates);
	updates.length = 0;
	return finishedUpdates;
}