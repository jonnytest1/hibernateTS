import { save } from 'hibernatets';
import { TestModel } from '../testmodels/example';

export async function testDuplicate() {
	const objects = []
	for (let i = 0; i < 5; i++) {
		objects.push(new TestModel(`${i}`, "asdf"))
	}
	await save(objects);
	objects.forEach(obj => obj.col2 = "def")


	await save(objects, { updateOnDuplicate: true });
}