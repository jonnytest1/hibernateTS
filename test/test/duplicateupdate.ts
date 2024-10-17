
import { load, save, type DataBaseBase } from '../../src/src';
import { TestModelNoPrimaryAndUnique } from '../testmodels/model-primaryandunique';
import { TestModelNoPrimary } from '../testmodels/model-witohut-primary';
import { TestModel } from '../testmodels/test-model';
import { assert } from '../util/assert';

export async function testDuplicate(pool: DataBaseBase) {

	await save(new TestModelNoPrimary("k", "k2", "test123"), { db: pool });

	const mode = await load(TestModelNoPrimary, m => m.test1 = "k", undefined, {
		first: true, db: pool
	})
	if (mode.valueCol !== "test123") {
		throw new Error("invalid initial value")
	}
	await save(new TestModelNoPrimary("k", "k2", "test1234"), { updateOnDuplicate: true, db: pool });
	const mode2 = await load(TestModelNoPrimary, {
		filter: m => m.test1 = "k",
		options: {
			first: true,
			db: pool

		}
	})
	if (mode2.valueCol !== "test1234") {
		throw new Error("didnt update")
	}


	const obj = new TestModelNoPrimaryAndUnique("abc", "123", "val")
	obj.valueTwo = true

	await save(obj, { updateOnDuplicate: true, db: pool });

	const obj2 = new TestModelNoPrimaryAndUnique("abc", "123", "val123")
	obj2.valueTwo = false
	await save(obj, {
		updateOnDuplicate: {
			skip: ["valueTwo"]
		}, db: pool
	});

	const model = await load(TestModelNoPrimaryAndUnique, {
		options: { first: true, db: pool },

	})
	assert(model.valueTwo, true, "overwrote disabled")


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