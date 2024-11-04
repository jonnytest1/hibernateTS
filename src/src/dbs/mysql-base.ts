import { staticImplements } from '../annotations/static-implements';
import { Exception } from '../exception';
import type { DataBaseBase, DataBaseBaseStatic, DatabaseResult, QueryStrings } from './database-base';
import { createPool, PoolConfig, type Connection, type Pool, type PoolConnection } from "mysql"
export const mySqlDbQueryStrings: QueryStrings = {
    mediumTextStr: "MEDIUMTEXT",
    constraintName(constraint, context) {
        return `unique_${context.table}_${constraint.columns.join("_")}`
    },
    uniqueConstraintSql(constraint, name, context) {
        name ??= mySqlDbQueryStrings.constraintName(constraint, context)
        const columnsStr = constraint.columns.map(c => `\`${c}\``).join(",")
        return `UNIQUE INDEX \`${name}\` (${columnsStr})`
    },
    duplicateKeyUpdate(keys, context) {
        return ' ON DUPLICATE KEY UPDATE ' + keys
            .map(key => `${key} = VALUES(${key})`).join(",")
    },
}


let defaultPoolCfg: Partial<PoolConfig> = {}


export function setMysqlDefaults(cfg: Partial<PoolConfig>) {
    defaultPoolCfg = cfg
}
type ConnectionLog = {
    timestamp: number;
    connectionTs?: number;
    closed?: number;
};

export const openPools = new Map<Pool, string>()

@staticImplements<DataBaseBase["constructor"]>()
export class MysqlBase implements DataBaseBase {

    public static queryStrings = mySqlDbQueryStrings;
    pool: Pool;
    static queryCt = 0;
    poolConnections: Array<ConnectionLog>;

    constructor(cfg: PoolConfig = {}) {
        const poolComfig: PoolConfig = {

        }
        Object.assign(poolComfig, defaultPoolCfg ?? {})
        Object.assign(poolComfig, cfg)

        this.pool = createPool(poolComfig);
        try {
            throw new Error("stack")
        } catch (e) {
            openPools.set(this.pool, e.stack)
        }
    }
    ['constructor']: DataBaseBaseStatic;

    private async query<T>(callback: (pool: PoolConnection) => Promise<T>): Promise<T> {
        MysqlBase.queryCt++;

        let connection: PoolConnection | undefined;
        const connectionLog: ConnectionLog = {
            timestamp: Date.now()
        }
        this.poolConnections.push(connectionLog)
        while (this.poolConnections[0] && (this.poolConnections[0].timestamp < (Date.now() - (1000 * 60 * 5)))) {
            this.poolConnections.shift()
        }
        try {
            connection = await new Promise((res, err) => {
                this.pool.getConnection((e, con) => {
                    if (e) {
                        err(e)
                    } else {
                        res(con)
                    }
                });
            })
            connectionLog.connectionTs = Date.now()
            if (!connection) {
                throw new Error("couldnt get connection")
            }
            const result = await callback(connection);

            connection.end()
            connectionLog.closed = Date.now()
            //await pool.end();
            return result;
        } catch (e) {
            if (connection) {
                await connection.end()
            }
            e.connectionLog = JSON.parse(JSON.stringify(this.poolConnections))
            //if (pool) {
            //await pool.end()
            //}
            console.error(e)
            throw e
        } finally {
            if (connection) {
                connection.end()
            }
        }


    }


    async sqlquery<T>(queryString: string, params?: Array<any>): Promise<DatabaseResult> {
        try {
            return await this.query(connection => new Promise((res, err) => {
                connection.query(queryString, params, (e, results, fields) => {
                    if (e) {
                        err(e)
                    } else {
                        res(results)
                    }
                })
            }))
        } catch (e) {
            throw new Exception("exception while executing sql: " + queryString, e);
        }
    }
    end(): Promise<void> {
        return new Promise((res, err) => {
            this.pool.end((e) => {
                if (e) {
                    err(e)
                } else {
                    openPools.delete(this.pool)
                    res()
                }
            })
        })
    }
    async selectQuery<T>(queryString: string, params?: Array<any>): Promise<Array<T>> {
        try {
            return await this.query(connection => new Promise((res, err) => {
                connection.query(queryString, params, (e, results, fields) => {
                    if (e) {
                        err(e)
                    } else {
                        res(results)
                    }
                })
            }))
        } catch (e) {
            throw new Exception("exception while executing sql: " + queryString, e);
        }
    }

}