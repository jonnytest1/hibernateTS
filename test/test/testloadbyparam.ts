import { save, load } from 'hibernatets';
import { TestModel } from '../testmodels/example';

export async function testloadbyparam() {
	const objects = []
	for (let i = 0; i < 5; i++) {
		objects.push(new TestModel(`${i}`, "asdf"))
	}
	await save(objects);

	await load(TestModel, m => m.col2 = "asdf")
}