import { load } from '../src/src/load';
import { TestModel } from './testmodels/test-model';



export function typeTEst() {


    const t: Promise<TestModel> = load(TestModel, {
        filter: `sdfsdf`,
        options: {
            first: true
        }
    })

    const t2: Promise<TestModel[]> = load(TestModel, {
        filter: `sdfsdf`,
        options: {
            first: false
        }
    })
    const t3: Promise<TestModel[]> = load(TestModel, "", [])
    const t4: Promise<TestModel> = load(TestModel, "", [], { first: true })



    console.log(t, t2, t3, t4)
}