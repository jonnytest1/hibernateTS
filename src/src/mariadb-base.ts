import * as mariadb from "mariadb";
import { Exception } from './exception';

interface DatabaseResult {
	insertId: BigInt,
	affectedRows: number,

	warningStatus: number
}

export class DataBaseBase {

	static queryCt = 0

	private async query<T>(callback: (pool: mariadb.Pool) => Promise<T>, db_name?: string): Promise<T> {
		DataBaseBase.queryCt++;
		const db = db_name || process.env.DB_NAME;
		const port = +process.env.DB_PORT;
		const user = process.env.DB_USER;
		const url = process.env.DB_URL;
		const password = process.env.DB_PASSWORD;
		const pool = mariadb.createPool({ host: url, user, connectionLimit: 5, password, port, database: db, });
		let connection: mariadb.PoolConnection;
		try {
			connection = await pool.getConnection();
			const result = await callback(pool);
			connection.release()
			await connection.end();
			await pool.end();
			return result;
		} catch (e) {
			if (connection) {
				connection.release()
				await connection.end()
			}
			if (pool) {
				await pool.end()
			}
			console.error(e)
			throw e
		}


	}

	async sqlquery<T>(queryString: string, params: Array<any> = []): Promise<DatabaseResult> {
		try {
			return await this.query(connection => connection.query(queryString, params))
		} catch (e) {
			throw new Exception("exception while executing sql: " + queryString, e);
		}
	}

	async selectQuery<T>(queryString: string, params: Array<any> = [], db_name?: string): Promise<Array<T>> {
		try {
			return await this.query(connection => connection.query(queryString, params), db_name)
		} catch (e) {
			throw new Exception("exception while executing sql: " + queryString, e);
		}
	}


}