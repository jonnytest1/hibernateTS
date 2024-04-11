
import { save, load, queries } from '../../src/src';
import { TestModel } from '../testmodels/test-model';
import { ClWithMApping } from '../testmodels/cl-with-mapping';
import { MappingCreate } from '../testmodels/mappingcreate';

export async function testsave() {

    const obj = new ClWithMApping("savetest");
    obj.test2 = new TestModel("abcee", "idontcare")
    obj.test2.timestamp = new Date(1712856663261)
    obj.test2.booleanIncTest = false
    obj.test.push(new TestModel("abceefgh", "idontcareeither"))
    await save(obj);


    const laodedObj = await load(ClWithMApping, obj.id, [], { deep: true, interceptArrayFunctions: true });

    if (!laodedObj.test2) {
        throw "didnt save or load mapping"
    }

    if (!laodedObj.test.length) {
        throw "didnt save or load mapping"
    }

    if (laodedObj.test[0].col2 != "idontcareeither") {
        throw "loaded or saved wrong"
    }
    if (laodedObj.test[0].booleanIncTest !== false) {
        throw "loaded or saved wrong"
    }
    const additionalModel = new TestModel("additional", "causewhynot");
    additionalModel.mappinglevel2 = new MappingCreate()
    additionalModel.mappinglevel2.value = "2ndlevel val"
    laodedObj.test.push(additionalModel)

    await queries(laodedObj);

    const afterMultilevelPush = await load(ClWithMApping, laodedObj.id, [], { deep: true })


    if (afterMultilevelPush.test.length != 2) {
        throw "didnt save / load second model"
    }

    if (!afterMultilevelPush.test[1].mappinglevel2) {
        throw "didnt save / load level2 model"
    }

    if (afterMultilevelPush.test[1].mappinglevel2.value !== "2ndlevel val") {
        throw "didnt save / load level2 model right"
    }


}