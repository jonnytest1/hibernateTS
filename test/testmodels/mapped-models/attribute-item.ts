
import { table } from 'hibernatets';
import { ExtendedMapItem } from "../../../src/src/extended-map/extended-map-item"

// hibernatets
@table()
export class AttributeItem extends ExtendedMapItem<string, string> {
    value: string;
    key: string

}