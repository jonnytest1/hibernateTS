
import { primary, table } from 'hibernatets';
import { mapping, Mappings } from '../../../src/src';
import { ExtendedMap } from '../../../src/src/extended-map/extended-map';
import { AttributeItem } from './attribute-item';

@table()
export class AttributeHolder {

    @primary()
    id

    @mapping(Mappings.OneToMany, AttributeItem, "attributeRef", { loadType: "map" })
    attributes = new ExtendedMap(AttributeItem, [])

}