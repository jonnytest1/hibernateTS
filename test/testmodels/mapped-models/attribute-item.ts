
import { table } from 'hibernatets';
import { ExtendedMapItem } from "../../../src/src/extended-map/extended-map-item"


@table()
export class AttributeItem extends ExtendedMapItem<string, string> {
    value: string;
    key: string

}