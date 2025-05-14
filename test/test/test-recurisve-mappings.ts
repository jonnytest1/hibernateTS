
import { load, save, type DataBaseBase } from '../../src/src';
import { SqlCondition } from '../../src/src/sql-condition';
import { RecursiveMapping } from '../testmodels/recursive-mapping';
import { TestModel } from '../testmodels/test-model';
import { calldWithCount } from './utils';

export async function testRecursiveMappings(pool: DataBaseBase) {


    const testModel = new TestModel("test123", "123");
    const recursiveBoundTestModel = new TestModel("recurisve", "rec");
    testModel.parent = new TestModel("p1", "567")
    const recursiveMApping = new RecursiveMapping();
    recursiveMApping.backwardsMapping = recursiveBoundTestModel;
    testModel.recursiveMappings.push(recursiveMApping)

    await save(testModel, { db: pool });

    const laodedModel = await load(TestModel, m => m.col2 = "123", undefined, { first: true, deep: true, db: pool });

    if (laodedModel.recursiveMappings.length !== 1) {
        throw "didnt load recursiveMapping"
    }
    if (!laodedModel.recursiveMappings[0].backwardsMapping) {
        throw "didnt load backwardsmapping"
    }
    if (laodedModel.recursiveMappings[0].backwardsMapping.col2 != "rec") {
        throw "didnt load correct backwardsmapping"
    }
    if (laodedModel.parent?.id !== "p1") {
        throw "didnt load recursive self referential model"
    }

    const loadingDepthsTestModel = new TestModel("test1234", "1234");
    const loadingDepthsRecursiveMapping = new RecursiveMapping();

    const otherTestModel = new TestModel("abc", "hjk")
    const otherRecusriveMapping = new RecursiveMapping();
    otherRecusriveMapping.backwardsMapping = loadingDepthsTestModel
    otherTestModel.recursiveMappings.push(otherRecusriveMapping)

    const otherRecusriveMapping2 = new RecursiveMapping();
    otherRecusriveMapping2.backwardsMapping = loadingDepthsTestModel

    const otherRecusriveMapping3 = new RecursiveMapping();
    otherRecusriveMapping3.backwardsMapping = loadingDepthsTestModel

    loadingDepthsRecursiveMapping.backwardsMapping = otherTestModel;
    loadingDepthsTestModel.recursiveMappings.push(loadingDepthsRecursiveMapping)

    const loadingDepthsRecursiveMapping2 = new RecursiveMapping();
    loadingDepthsRecursiveMapping2.backwardsMapping = loadingDepthsTestModel;
    loadingDepthsTestModel.recursiveMappings.push(loadingDepthsRecursiveMapping2)

    const loadingDepthsRecursiveMapping3 = new RecursiveMapping();
    loadingDepthsRecursiveMapping3.backwardsMapping = loadingDepthsTestModel;
    loadingDepthsTestModel.recursiveMappings.push(loadingDepthsRecursiveMapping3)

    await save([loadingDepthsTestModel, otherTestModel], { db: pool })

    const loads = await Promise.all([
        load(TestModel, m => m.col2 = loadingDepthsTestModel.col2, undefined, {
            deep: {
                "backwardsMapping": "TRUE=TRUE",
                "recursiveMappings": {
                    filter: "TRUE=TRUE",
                    depths: 4
                }
            }, first: true, db: pool
        }),
        load(TestModel, m => m.col2 = loadingDepthsTestModel.col2, undefined, {
            deep: {
                "backwardsMapping": SqlCondition.ALL,
                "recursiveMappings": {
                    filter: SqlCondition.ALL,
                    depths: 4
                }
            }, first: true, db: pool
        })
    ])
    for (const loadedData of loads) {
        if (loadedData.recursiveMappings.length !== 3) {
            throw "didnt load recursiveMappings"
        }

        if (!loadedData.recursiveMappings[0].backwardsMapping) {
            throw "didnt load backwardsmapping"
        }

        if (!loadedData.recursiveMappings[2].backwardsMapping) {
            throw "didnt load backwardsmapping 2"
        }

        if (loadedData.recursiveMappings[0].backwardsMapping.col2 != "hjk") {
            throw "didnt load backwardsmapping att"
        }

        if (loadedData.recursiveMappings[0].backwardsMapping.recursiveMappings[0].backwardsMapping.col2 != "1234") {
            throw "didnt load backwardsmapping rec2"
        }
    }

}