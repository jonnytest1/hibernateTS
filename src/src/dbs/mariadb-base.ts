import * as mariadb from "mariadb";
import { Exception } from '../exception';
import type { DataBaseBase, DataBaseBaseStatic, DatabaseResult } from './database-base';
import { staticImplements } from '../annotations/static-implements';



export const openPools = new Map<mariadb.Pool, string>()



let defaultOpts: Partial<mariadb.PoolConfig>
export function setMariaDbPoolDefaults(opts: Partial<mariadb.PoolConfig>) {
	defaultOpts = opts
}



type ConnectionLog = {
	timestamp: number;
	connectionTs?: number;
	closed?: number;
};
@staticImplements<DataBaseBase["constructor"]>()
export class MariaDbBase implements DataBaseBase {

	static queryCt = 0
	static mediumTextStr = "MEDIUMTEXT"

	poolConnections: Array<ConnectionLog> = []
	pool: mariadb.Pool
	constructor(database?: string, poolSize?: number | Partial<mariadb.PoolConfig>) {
		const db = database || process.env.DB_NAME;
		const port = +process.env.DB_PORT;
		const user = process.env.DB_USER;
		const url = process.env.DB_URL;
		const password = process.env.DB_PASSWORD;

		const config: mariadb.PoolConfig = {}

		Object.assign(config, defaultOpts)

		if (typeof poolSize === "number") {
			config.connectionLimit = poolSize
		} else if (!poolSize) {
			config.connectionLimit = 5
		} else {
			Object.assign(config, poolSize)
		}


		this.pool = mariadb.createPool({
			host: url,
			user,
			password,
			port,
			database: db,
			...config
		});

		try {
			throw new Error("stack")
		} catch (e) {
			openPools.set(this.pool, e.stack)
		}
	}
	['constructor']: DataBaseBaseStatic;



	private async query<T>(callback: (pool: mariadb.Connection) => Promise<T>): Promise<T> {
		MariaDbBase.queryCt++;

		let connection: mariadb.PoolConnection;
		const connectionLog: ConnectionLog = {
			timestamp: Date.now()
		}
		this.poolConnections.push(connectionLog)
		while (this.poolConnections[0] && (this.poolConnections[0].timestamp < (Date.now() - (1000 * 60 * 5)))) {
			this.poolConnections.shift()
		}
		try {
			connection = await this.pool.getConnection();
			connectionLog.connectionTs = Date.now()
			const result = await callback(connection);

			connection.end().then(() => {
				connectionLog.closed = Date.now()
			});
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

	async sqlquery<T>(queryString: string, params: Array<any> = []): Promise<DatabaseResult> {
		try {
			return await this.query(connection => connection.query(queryString, params))
		} catch (e) {
			throw new Exception("exception while executing sql: " + queryString, e);
		}
	}

	async selectQuery<T>(queryString: string, params: Array<any> = []): Promise<Array<T>> {
		try {
			return await this.query(connection => connection.query(queryString, params))
		} catch (e) {
			throw new Exception("exception while executing sql: " + queryString, e);
		}
	}


	public end() {
		return this.pool.end().then(() => {
			openPools.delete(this.pool)
		})
	}

}



export async function withMariaDbPool<T>(consumer: (pool: MariaDbBase) => Promise<T>) {
	const base = new MariaDbBase()
	try {
		return await consumer(base)
	} finally {
		base.end()
	}
}