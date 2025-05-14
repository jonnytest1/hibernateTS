import { Exception } from '../exception';
import type { DataBaseBase, DataBaseBaseStatic, DatabaseResult, QueryStrings } from './database-base';
import { Client, Pool, PoolConfig, type PoolClient } from "pg"

import { lookup, type LookupAddress } from "dns"
import { staticImplements } from '../annotations/static-implements';
import type { ColumnDefinition, DataBaseConfig } from '../annotations/database-config';
import type { ISaveAbleObject } from '../interface/mapping';
type ConnectionLog = {
    timestamp: number;
    connectionTs?: number;
    closed?: number;
};

interface PSqlBaseEnv {
    PSQL_URL: string
    PSQL_PORT: string
    PSQL_PWD: string

    PSQL_USER: string
    PSQL_DB: string
    [key: string]: string

}


const psqlQueryStrings: QueryStrings = {
    mediumTextStr: "TEXT",
    constraintName(constraint, context) {
        return `${context.table}_${constraint.columns.join("_")}`
    },
    uniqueConstraintSql(constraint, name, context) {
        name ||= psqlQueryStrings.constraintName(constraint, context)
        const columnsStr = constraint.columns.map(c => `"${c}"`).join(",")
        return `CONSTRAINT "${name}" UNIQUE (${columnsStr})`
    },
    duplicateKeyUpdate(keys, context) {

        if (context.options?.constraints?.length) {
            for (const constraint of context.options?.constraints ?? []) {
                const colsStr = constraint.columns.map(c => `"${c}"`).join(",")

                return `ON CONFLICT (${colsStr}) DO UPDATE 
                    SET ${keys.map(k => `${k} = excluded.${k} `)}`
            }
        }
        if (context.modelPrimary) {
            return `ON CONFLICT ("${context.modelPrimary}") DO UPDATE 
                SET ${keys.map(k => `${k} = excluded.${k} `)}`
        }

        return ""
    },

    insertQuery(sql, context) {
        if (context.modelPrimary) {
            return `${sql} RETURNING ("${context.modelPrimary}")`
        }
        return sql
    },

    convertValue(val, column) {
        if (column.opts?.type === "boolean" && typeof val == 'boolean') {
            return Number(val)
        }
        return val
    },
}


@staticImplements<DataBaseBase["constructor"]>()
export class PsqlBase implements DataBaseBase {


    static queryStrings = psqlQueryStrings

    static queryCt = 0
    pool: Pool;
    poolConnections: Array<ConnectionLog> = []

    databasename: string


    constructor(options: PoolConfig | string = {}, count?: number) {
        const env = process.env as PSqlBaseEnv

        const poolOptinos: PoolConfig = {}
        poolOptinos.host = env.PSQL_URL
        poolOptinos.port = +env.PSQL_PORT
        poolOptinos.password = env.PSQL_PWD
        poolOptinos.user = env.PSQL_USER ?? "postgres"
        poolOptinos.database = env.PSQL_DB ?? env.PSQL_USER ?? "postgres"

        if (count !== undefined) {
            poolOptinos.max = count
        }
        if (typeof options === "string") {
            this.databasename = options
            //poolOptinos.database=

        } else {
            Object.assign(poolOptinos, options)
        }

        lookup(poolOptinos.host, {
            all: true,
            family: 4
        }, (_err, address, family) => {
            poolOptinos.host = address[address.length - 1].address



            this.pool = new Pool(poolOptinos)
        })


    }
    ['constructor']: DataBaseBaseStatic;

    private async query<T>(callback: (pool: PoolClient) => Promise<T>): Promise<T> {
        while (!this.pool) {
            await new Promise(res => setTimeout(res, 5))
        }


        PsqlBase.queryCt++;

        let connection: PoolClient | undefined;
        const connectionLog: ConnectionLog = {
            timestamp: Date.now()
        }
        this.poolConnections.push(connectionLog)
        while (this.poolConnections[0] && (this.poolConnections[0].timestamp < (Date.now() - (1000 * 60 * 5)))) {
            this.poolConnections.shift()
        }
        let released = false
        try {
            connection = await this.pool.connect();
            connectionLog.connectionTs = Date.now()
            const result = await callback(connection);
            connection.release()
            released = true
            connectionLog.closed = Date.now()
            //await pool.end();
            return result;
        } catch (e) {
            e.connectionLog = JSON.parse(JSON.stringify(this.poolConnections))
            //if (pool) {
            //await pool.end()
            //}
            console.error(e)
            throw e
        } finally {
            if (connection && !released) {
                connection.release()
            }
        }


    }

    async sqlquery<T>(cfg: DataBaseConfig<T>, queryString: string, params?: Array<any>): Promise<DatabaseResult> {
        queryString = this.postgresifyQuery(queryString);
        try {
            const result = await this.query(connection => connection.query(queryString, params))

            let insertId: null | BigInt = null

            if (queryString.startsWith("INSERT") && result.rows[0]?.[cfg.modelPrimary] !== undefined) {
                insertId = result.rows[0]?.[cfg.modelPrimary]

                const colDef: ColumnDefinition | undefined = cfg.columns[cfg.modelPrimary];
                if (colDef?.primaryType !== "custom") {
                    insertId = BigInt(result.rows[0]?.id)
                }
            }

            return {
                affectedRows: result.rowCount!,
                insertId: insertId!,
                warningStatus: 0

            }
        } catch (e) {
            throw new Exception("exception while executing sql: " + queryString, e);
        }
    }
    private postgresifyQuery(queryString: string) {
        let ct = 1;
        queryString = queryString.replace(/\?/g, (repl, ...args) => {
            return `$${ct++}`;
        });
        queryString = queryString.replace(/BIGINT (NOT )?(NULL )? +AUTO_INCREMENT/g, `bigserial`);
        queryString = queryString.replace(/COLLATE=[^ ]* /g, ``);
        queryString = queryString.replace(/ENGINE=[^ ]* /g, ``);
        queryString = queryString.replace(/\WCHANGE COLUMN /g, ` ALTER COLUMN `);
        queryString = queryString.replace(/ MEDIUMTEXT /g, ` TEXT `);
        queryString = queryString.replace(/ DATETIME /g, ` TIMESTAMPTZ `);
        queryString = queryString.replace(/ TINYINT /g, ` BIT `);
        queryString = queryString.replace(/`/g, `"`);
        if (queryString.includes("CHANGE")) {
            debugger
        }

        if (this.databasename === "information_schema") {
            queryString = queryString.toLowerCase();
        }
        return queryString;
    }

    async end(): Promise<void> {
        while (!this.pool) {
            await new Promise(res => setTimeout(res, 5))
        }
        return this.pool.end()
    }
    async selectQuery<T>(queryString: string, params?: Array<any>): Promise<Array<T>> {

        queryString = this.postgresifyQuery(queryString);
        try {
            const result = await this.query(connection => connection.query(queryString, params))

            return result.rows.map(o => {
                if (this.databasename === "information_schema") {
                    return Object.fromEntries(Object.entries(o).map(([key, val]) => [key.toUpperCase(), val]))
                }

                return o

            })
        } catch (e) {
            throw new Exception("exception while executing sql: " + queryString, e);
        }
    }



}