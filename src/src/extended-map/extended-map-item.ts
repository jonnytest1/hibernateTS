import { column, primary } from '../annotations/database-annotation'

export class ExtendedMapItem<T = string, K = string> {

    @primary()
    id

    @column()
    value: T

    @column()
    key: K
}