import { save, load } from 'hibernatets';
import { TestModel } from '../testmodels/test-model';
import { ClWithMApping } from '../testmodels/cl-with-mapping';

export async function testloadbyparam() {
	const objects = []
	for (let i = 0; i < 5; i++) {
		objects.push(new TestModel(`${i}`, "asdf"))
	}
	await save(objects);

	const model = await load(TestModel, m => m.col2 = "asdf")
}

