import { ClWithMApping } from '../testmodels/mapping';
import { save, load, queries, remove } from 'hibernatets';
import { TestModel } from '../testmodels/example';
import { updateSetAccessor } from 'typescript';
import { deleteFnc } from 'hibernatets/delete';

export async function testmapping() {


	await save(new ClWithMApping())

	const mapping = await load(ClWithMApping, 1)
	mapping.test2 = new TestModel("bva", "hallo")

	mapping.test.push(new TestModel("asd", "asdf"))

	await queries(mapping);

	const loadMapping = await load(ClWithMApping, 1)
	if (!loadMapping.test2) {
		throw "didnt store"
	}

	await remove(loadMapping)
	await new Promise(res => {
		setTimeout(res, 5000)
	})



}