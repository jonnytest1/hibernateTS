import { SqlParameter } from './load';


export class SqlCondition {

    static readonly ALL = new SqlCondition("TRUE=TRUE")

    parameters: Array<SqlParameter> = [];
    usedcolumns: Array<string> = []
    constructor(private sql?: string) {

    }

    /**
     * 
     * @param columnName you should really make this a constant ... i mean REALLY
     * @returns 
     */
    column(columnName: string) {
        if (columnName.match(/[`'"]/g)) {
            throw new Error("dont do this >:/")
        }
        this.usedcolumns.push(columnName)
        this.sql += `\`${columnName}\` `
        return this;
    }

    smaller() {
        this.sql += "< "
        return this
    }
    greater() {
        this.sql += "> "
        return this
    }
    now() {
        this.sql += "UNIX_TIMESTAMP(NOW(3))*1000 "
    }

    param(value: SqlParameter | Date) {
        if (value instanceof Date) {
            value = value.valueOf()
        }
        this.parameters.push(value)
        return this
    }

    and(cb: (condition: SqlCondition) => SqlCondition) {
        const cond = new SqlCondition()
        cb(cond)
        this.sql += `AND ${cond.build(this.parameters)} `
        return this
    }

    equals(other: SqlParameter) {
        this.sql += " = ? "
        this.parameters.push(other)
        return this
    }

    checkColumns(classref) {
        const instnace = new classref();
        for (const column of this.usedcolumns) {
            if (!Object.keys(instnace).includes(column)) {
                throw new Error("missing column")
            }

        }
    }

    build(params: Array<SqlParameter> | null) {
        if (this.parameters.length) {
            if (params == null) {
                throw new Error("cannot use parameters for this condition currently")
            }
            params.push(...this.parameters)
        }
        return this.sql;
    }



}