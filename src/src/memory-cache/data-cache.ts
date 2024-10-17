import type { DataBaseBase } from '../dbs/database-base'



export interface DataCacheOptions {
    // this is neccessary to prevent conflicts
    table_prefix: string


    poolGenerator: () => DataBaseBase

    modelDatabase: string
}

type ColumnQuery = {
    COLUMN_NAME: string
    DATA_TYPE: "varchar" | "bigint" | "int" | "mediumint" | "text",
    CHARACTER_MAXIMUM_LENGTH: number
    TABLE_NAME: string
}
type ConstraintQuery = {
    TABLE_NAME: string
    CONSTRAINT_TYPE: "UNIQUE" | "PRIMARY KEY"
    CONSTRAINT_NAME: string
}


export class DataCache {

    private tableData: {
        tables: Set<string>,
        columns: { [table: string]: ColumnQuery[] }
    }

    constructor(private options: DataCacheOptions) {

        this.preload()
    }


    async preload() {
        const pool = this.options.poolGenerator()
        const modelDb = this.options.modelDatabase;
        const [tables, columns] = await Promise.all([
            pool.selectQuery<{ TABLE_NAME: string }>("SELECT TABLE_NAME FROM information_schema.`TABLES` WHERE TABLE_SCHEMA = ? and starts_with(TABLE_NAME,?)  ", [modelDb]).then(db => {
                return new Set(db.map(table => table.TABLE_NAME))
            }),
            pool.selectQuery<ColumnQuery>("SELECT * FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = ? ", [modelDb]).then(columns => {
                const tableColumnMap: { [table: string]: Array<ColumnQuery> } = {}

                for (const column of columns) {
                    tableColumnMap[column.TABLE_NAME] ??= []
                    tableColumnMap[column.TABLE_NAME].push(column)
                }
                return tableColumnMap
            })
        ])
        this.tableData = {
            tables,
            columns
        }
    }


}