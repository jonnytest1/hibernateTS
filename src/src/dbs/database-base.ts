import type { Constraint } from '../annotations/database-annotation';
import type { DataBaseConfig } from '../annotations/database-config';

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


export interface QueryStrings {
    mediumTextStr: string;

    constraintName(constraint: Constraint<unknown>, context: DataBaseConfig): string

    uniqueConstraintSql(columns: Constraint<unknown>, name: string | undefined, context: DataBaseConfig): string;
}

export type DataBaseBaseStatic = {

    queryStrings: QueryStrings



    new(): DataBaseBase

}