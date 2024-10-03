
import { load, save, type DataBaseBase } from '../../src/src';
import { TestModelNoPrimary } from '../testmodels/model-witohut-primary';
import { TestModel } from '../testmodels/test-model';

export async function testDuplicate(pool: DataBaseBase) {

	await save(new TestModelNoPrimary("k", "k2", "test123"), { db: pool });

	const mode = await load(TestModelNoPrimary, m => m.test1 = "k", undefined, {
		first: true, db: pool
	})
	if (mode.valueCol !== "test123") {
		throw new Error("invalid initial value")
	}
	await save(new TestModelNoPrimary("k", "k2", "test1234"), { updateOnDuplicate: true, db: pool });
	const mode2 = await load(TestModelNoPrimary, m => m.test1 = "k", undefined, {
		first: true, db: pool
	})
	if (mode2.valueCol !== "test1234") {
		throw new Error("didnt update")
	}

	debugger;


	const objects = []
	for (let i = 0; i < 5; i++) {
		objects.push(new TestModel(`${i}`, "asdf"))
	}
	await save(objects, { db: pool });
	objects.forEach(obj => obj.col2 = "def")

	for (let i = 0; i < 5; i++) {
		objects[i] = new TestModel(`${i}`, "asdf2")
	}
	await save(objects, { updateOnDuplicate: true, db: pool });
	debugger;

}