import { load, save } from '../../src/src'
import { DataBaseBase } from '../../src/src/mariadb-base'
import { ClWithMApping } from '../testmodels/cl-with-mapping'
import { TestModel } from '../testmodels/test-model'

export async function testlaodCalls() {

    const cl1 = new ClWithMApping()
    cl1.test.push(new TestModel(1, "123"))
    cl1.test.push(new TestModel(2, "1232"))

    const cl2 = new ClWithMApping()
    cl2.test.push(new TestModel(3, "1233"))
    cl2.test.push(new TestModel(4, "124"))

    const saved = await save([cl1, cl2])

    let queryCount = DataBaseBase.queryCt
    const loaded = await load(ClWithMApping, "TRUE=TRUE", undefined, {
        deep: ["test"]
    })
    const newCount = DataBaseBase.queryCt
    if (queryCount + 2 !== newCount) {
        throw "didnt load stuff efficiently"
    }


    if (loaded.length != 2) {
        throw "didnt load all"
    }

    if (loaded[0].test.length !== 2) {
        throw "didnt load nested"
    }
    if (loaded[1].test.length !== 2) {
        throw "didnt load nested"
    }
}