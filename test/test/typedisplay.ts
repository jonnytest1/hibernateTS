import { load } from '../../src/src/load'
import { TestModel } from '../testmodels/test-model'


async () => {


    const modelArray = await load(TestModel, m => m.col2 = "asdf") // typed to Array<TestModel>
    const modelArrayStr = await load(TestModel, "A = B") // typed to Array<TestModel>
    const modelSingle = await load(TestModel, m => m.col2 = "asdf", [], { first: true })// typed to TestModel 
    const modelStr = await load(TestModel, "A = B", [], { first: true }) // typed to TestModel


    const modelStr2 = await load(TestModel, "A = B", [], { first: true, deep: ["col2", "description"] }) // typed to TestModel


}