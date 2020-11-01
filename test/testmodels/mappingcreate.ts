import { column, mapping, Mappings, primary, table } from 'hibernatets';

@table()
export class MappingCreate {

    @primary()
    id

    @column()
    value

}