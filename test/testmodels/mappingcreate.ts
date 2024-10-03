
import { column, mapping, Mappings, primary, table } from '../../src/src';
import type { ClWithMApping } from './cl-with-mapping';
// hibernatets
@table()
export class MappingCreate {

    @primary()
    id: number

    @column()
    value

    @column({
        transformations: {
            loadFromDbToProperty: async str => {
                return new Uint32Array(JSON.parse(str)).buffer;
            },
            saveFromPropertyToDb: async buffer => JSON.stringify([...new Uint32Array(buffer)])
        }
    })
    transformedProperty: ArrayBuffer
}