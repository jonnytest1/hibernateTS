import * as mariadb from "mariadb";
import { Exception } from './exception';

interface DatabaseResult {
	insertId: BigInt,
	affectedRows: number,

	warningStatus: number
}


export const openPools = new Map<mariadb.Pool, string>()


export class DataBaseBase {

	static queryCt = 0


	pool: mariadb.Pool
	constructor(database?: string, poolSize?: number) {
		const db = database || process.env.DB_NAME;
		const port = +process.env.DB_PORT;
		const user = process.env.DB_USER;
		const url = process.env.DB_URL;
		const password = process.env.DB_PASSWORD;
		this.pool = mariadb.createPool({ host: url, user, connectionLimit: poolSize ?? 5, password, port, database: db, });

		try {
			throw new Error("stack")
		} catch (e) {
			openPools.set(this.pool, e.stack)
		}
	}



	private async query<T>(callback: (pool: mariadb.Connection) => Promise<T>): Promise<T> {
		DataBaseBase.queryCt++;

		let connection: mariadb.PoolConnection;
		try {
			connection = await this.pool.getConnection();
			const result = await callback(connection);
			connection.release()
			connection.end();
			//await pool.end();
			return result;
		} catch (e) {
			if (connection) {
				connection.release()
				await connection.end()
			}
			//if (pool) {
			//await pool.end()
			//}
			console.error(e)
			throw e
		} finally {
			if (connection) {
				connection.release()
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



export async function withPool<T>(consumer: (pool: DataBaseBase) => Promise<T>) {
	const base = new DataBaseBase()
	try {
		return await consumer(base)
	} finally {
		base.end()
	}
}