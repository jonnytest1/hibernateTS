import { load, queries, save } from '../../src/src';
import { TestModel } from '../testmodels/test-model';
import { ClWithMApping } from '../testmodels/cl-with-mapping';

export async function testloaddeep() {


    const saved = await save(new ClWithMApping())

    const cl = await load(ClWithMApping, saved[0])
    cl.test.push(new TestModel("asd", "dfgdfgdfgsfrse"))
    cl.test.push(new TestModel("dfgdfg", "dfgdfgdh"))
    cl.test2 = new TestModel("dfgfg", "gjdj")
    await queries(cl);

    const model = await load(ClWithMApping, m => m.id = cl.id, [], { first: true, deep: true })

    if (model.test.length !== 2) {
        throw "didnt load oneToMany"
    }
    if (!model.test2) {
        throw "didnt load oneToOne"
    }


    const model2 = await load(ClWithMApping, m => m.id = cl.id, [], { first: true, deep: ["test"] })

    if (model2.test.length !== 2) {
        throw "didnt load oneToMany"
    }
    if (model2.test2) {
        throw "did load oneToOne"
    }

    const model3 = await load(ClWithMApping, m => m.id = cl.id, [], { first: true, deep: ["test2"] })

    if (model3.test.length === 2) {
        throw "did load oneToMany"
    }
    if (!model3.test2) {
        throw "didnt load oneToOne"
    }

    const model4 = await load(ClWithMApping, m => m.id = cl.id, [], {
        first: true,
        deep: {
            test: "col2 = 'dfgdfgdfgsfrse'"
        }
    })

    if (model4.test.length === 2) {
        throw "did load oneToMany"
    }
    if (model4.test.length === 0) {
        throw "didnt load oneToMany"
    }
    if (model4.test[0].col2 !== 'dfgdfgdfgsfrse') {
        throw "loaded wrong oneToMany"
    }
    if (model4.test2) {
        throw "loaded oneToOne"
    }
}