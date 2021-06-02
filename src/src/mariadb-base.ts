import * as mariadb from "mariadb";

interface DatabaseResult {
	insertId: number,
	affectedRows: number,

	warningStatus: number
}

export class DataBaseBase {

	private async query<T>(callback: (pool: mariadb.Pool) => Promise<T>, db_name?: string): Promise<T> {
		const db = db_name || process.env.DB_NAME;
		const port = +process.env.DB_PORT;
		const user = process.env.DB_USER;
		const url = process.env.DB_URL;
		const password = process.env.DB_PASSWORD;
		const pool = mariadb.createPool({ host: url, user, connectionLimit: 5, password, port, database: db });
		let connection;
		try {
			connection = await pool.getConnection();
			const result = await callback(pool);
			await connection.end();
			await pool.end();
			return result;
		} catch (e) {
			if (connection) {
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
		return this.query(connection => connection.query(queryString, params));
	}

	async selectQuery<T>(queryString: string, params: Array<any> = [], db_name?: string): Promise<Array<T>> {
		return this.query(connection => connection.query(queryString, params), db_name);
	}


}