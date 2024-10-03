
export interface DatabaseResult {
    insertId: BigInt,
    affectedRows: number,

    warningStatus: number
}



export type DataBaseBase = {
    constructor: DataBaseBaseStatic
    sqlquery<T>(queryString: string, params?: Array<any>): Promise<DatabaseResult>
    end(): Promise<void>;

    selectQuery<T>(queryString: string, params?: Array<any>): Promise<Array<T>>
}


export type DataBaseBaseStatic = {
    mediumTextStr: string

    new(): DataBaseBase

}