import { column, mapping, Mappings, primary, table } from 'hibernatets';

@table()
export class MappingCreate {

    @primary()
    id

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