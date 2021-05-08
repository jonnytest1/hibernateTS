
import { load, queries, save } from '../../../src/src';
import { AttributeHolder } from './attribute-map';

export async function testMAp() {


    const mapHolder = new AttributeHolder()
    mapHolder.attributes.setValue("attribute1", "123")


    await save(mapHolder)


    const loadedAttributeHodler = await load(AttributeHolder, mapHolder.id, undefined, {
        deep: true
    })

    if (loadedAttributeHodler.attributes.size != 1) {
        throw new Error("ddint load attributes")
    }

    if (loadedAttributeHodler.attributes.getValue("attribute1") != "123") {
        throw new Error("ddint load attributes")
    }

    loadedAttributeHodler.attributes.setValue("val2", "stuff2")
    loadedAttributeHodler.attributes.setValue("val3", "stuff4")
    await queries(loadedAttributeHodler);

    loadedAttributeHodler.attributes.clear()

    await (queries(loadedAttributeHodler))


    if (loadedAttributeHodler.attributes.size > 0) {
        throw new Error("ddint clear correclty")
    }

}