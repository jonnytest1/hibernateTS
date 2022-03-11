
import { load, queries, save } from '../../src/src';
import { MappingCreate } from '../testmodels/mappingcreate';

export async function testDbTransformer() {

    const obj = new MappingCreate()
    obj.transformedProperty = new Uint8Array([1, 2, 3, 8]).buffer
    await save(obj);

    const laodedObj = await load(MappingCreate, obj.id, [], { deep: true });

    if (!laodedObj.transformedProperty) {
        throw "didnt save or load mapping"
    }

    if (!(laodedObj.transformedProperty instanceof ArrayBuffer)) {
        throw "wrong type"
    }

    if (laodedObj.transformedProperty.byteLength != 4) {
        throw "missing data"
    }


    laodedObj.transformedProperty = new Int8Array([12455, 903485, 23784, 234234234]).buffer
    await queries(laodedObj);
    const reloadedObj = await load(MappingCreate, obj.id, [], { deep: true });

    if (!reloadedObj.transformedProperty) {
        throw "didnt save or load mapping"
    }

    if (!(reloadedObj.transformedProperty instanceof ArrayBuffer)) {
        throw "wrong type"
    }

    if (reloadedObj.transformedProperty.byteLength != 4) {
        throw "missing data"
    }
}