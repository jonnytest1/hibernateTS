
import { save, load } from '../../src/src';
import { TestModel } from '../testmodels/example';
import { ClWithMApping } from '../testmodels/mapping';

export async function testsave() {

    const obj = new ClWithMApping("savetest");
    obj.test2 = new TestModel("abcee", "idontcare")
    obj.test.push(new TestModel("abceefgh", "idontcareeither"))
    await save(obj);


    const laodedObj = await load(ClWithMApping, obj.id, [], { deep: true });

    if (!laodedObj.test2) {
        throw "didnt save or load mapping"
    }

    if (!laodedObj.test.length) {
        throw "didnt save or load mapping"
    }

    if (laodedObj.test[0].col2 != "idontcareeither") {
        throw "loaded or saved wrong"
    }


}