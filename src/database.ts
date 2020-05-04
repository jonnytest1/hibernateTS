import { save } from './save';
import { load } from './load';
import { deleteObject } from './delete';
import { intercept } from './intercept';



class Database {


	constructor() {
	}

	public async queries(object: any): Promise<Array<number>> {
		const updates: Array<Promise<number>> = object["_dbUpdates"] || [];
		const finishedUpdates = await Promise.all(updates);
		updates.length = 0;
		return finishedUpdates;
	}

	public save = save.save;

	public load = load.load;

	public delete = deleteObject.delete;

	public intercept = intercept.intercept;

}

export const database = new Database();