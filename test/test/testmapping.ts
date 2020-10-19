import { ClWithMApping } from '../testmodels/mapping';
import { save, load } from 'hibernatets';
import { TestModel } from '../testmodels/example';

export async function testmapping() {


	await save(new ClWithMApping())

	const mapping = await load(ClWithMApping, 1)
	mapping.test.push(new TestModel("asd", "asdf"))
}