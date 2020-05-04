
import { load } from './load';
import { deleteObject } from './delete';
import { intercept } from './intercept';
import { save } from './save';

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
module.exports = new Database();