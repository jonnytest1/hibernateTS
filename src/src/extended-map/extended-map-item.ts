import { column, primary } from '../annotations/database-annotation'

export class ExtendedMapItem<K extends string = string, T = any> {

    @primary()
    id

    @column()
    value: T

    @column()
    key: K
}