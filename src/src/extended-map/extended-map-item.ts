import { column, primary } from '../annotations/database-annotation'

export class ExtendedMapItem<K = string, T = string> {

    @primary()
    id

    @column()
    value: T

    @column()
    key: K
}