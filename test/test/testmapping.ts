import { ClWithMApping } from '../testmodels/cl-with-mapping';
import { save, load, queries } from 'hibernatets';
import { TestModel } from '../testmodels/test-model';
import { remove } from '../../src/src';

export async function testmapping() {


	const saved = await save(new ClWithMApping())

	const mapping = await load(ClWithMApping, saved[0])
	mapping.test2 = new TestModel("bva", "hallo")
	mapping.test2.randomtext = "abc"
	mapping.test.push(new TestModel("asd", "asdf"))

	await queries(mapping);

	const loadMapping = await load(ClWithMApping, 1, undefined, { deep: true })
	if (!loadMapping.test2) {
		throw "didnt store"
	}

	await remove(loadMapping, { deep: true })
	/*await new Promise(res => {
		setTimeout(res, 5000)
	})*/

	const loaded = await load(ClWithMApping, loadMapping.id)
	if (loaded) {
		throw "failed deleting"
	}

	const loadedMapping = await load(TestModel, "`id` = ?", [mapping.test2.id], { first: true })
	if (loadedMapping) {
		throw "failed deleting"
	}


}