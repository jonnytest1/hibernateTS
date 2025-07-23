import { column, primary, table } from '../annotations/database-annotation'

@table()
export class ExtendedMapItem<K extends string = string, T = any> {

    @primary()
    id

    @column()
    value: string

    @column()
    key: K

    parsed(): T {
        return JSON.parse(this.value)
    }

    setStringified(value: T) {
        this.value = JSON.stringify(value)
    }
}