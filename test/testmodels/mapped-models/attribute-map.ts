
import { primary, table } from 'hibernatets';
import { ExtendedMapItem, mapping, Mappings } from '../../../src/src';
import { ExtendedMap } from '../../../src/src/extended-map/extended-map';
import { AttributeItem } from './attribute-item';

@table()
export class AttributeHolder {

    @primary()
    id: number

    @mapping(Mappings.OneToMany, AttributeItem, "attributeRef", { loadType: "map" })
    attributes = new ExtendedMap(AttributeItem, [])

}



interface NewType {
    test: "test1" | "test2";
    hallo: "test2" | "abd";
}

let t: ExtendedMap<ExtendedMapItem<keyof NewType>, NewType>