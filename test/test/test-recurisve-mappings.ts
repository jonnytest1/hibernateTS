
import { load, save } from '../../src/src';
import { RecursiveMapping } from '../testmodels/recursive-mapping';
import { TestModel } from '../testmodels/test-model';

export async function testRecursiveMappings() {


    const testModel = new TestModel("test123", "123");
    const recursiveBoundTestModel = new TestModel("recurisve", "rec");

    const recursiveMApping = new RecursiveMapping();
    recursiveMApping.backwardsMapping = recursiveBoundTestModel;
    testModel.recursiveMappings.push(recursiveMApping)

    await save(testModel);

    const laodedModel = await load(TestModel, m => m.col2 = "123", undefined, { first: true, deep: true });

    if (laodedModel.recursiveMappings.length !== 1) {
        throw "didnt load recursiveMapping"
    }
    if (!laodedModel.recursiveMappings[0].backwardsMapping) {
        throw "didnt load backwardsmapping"
    }
    if (laodedModel.recursiveMappings[0].backwardsMapping.col2 != "rec") {
        throw "didnt load correct backwardsmapping"
    }


    const loadingDepthsTestModel = new TestModel("test1234", "1234");
    const loadingDepthsRecursiveMapping = new RecursiveMapping();
    loadingDepthsRecursiveMapping.backwardsMapping = loadingDepthsTestModel;

    loadingDepthsTestModel.recursiveMappings.push(loadingDepthsRecursiveMapping)

    await save(loadingDepthsTestModel)


    const loadedDepthsModel = await load(TestModel, m => m.col2 = loadingDepthsTestModel.col2, undefined, {
        deep: {
            "backwardsMapping": "TRUE=TRUE",
            "recursiveMappings": {
                filter: "TRUE=TRUE",
                depths: 2
            }
        }, first: true
    })

    if (loadedDepthsModel.recursiveMappings.length !== 1) {
        throw "didnt load recursiveMapping"
    }

    if (!loadedDepthsModel.recursiveMappings[0].backwardsMapping) {
        throw "didnt load backwardsmapping"
    }
}