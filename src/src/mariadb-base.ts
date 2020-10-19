import * as mariadb from "mariadb";

interface DatabaseResult {
	insertId: number,
	affectedRows: number,

	warningStatus: number
}

export class DataBaseBase {

	private async query<T>(callback: (pool: mariadb.Pool) => Promise<T>): Promise<T> {
		const db = process.env.DB_NAME;
		const port = +process.env.DB_PORT;
		const user = process.env.DB_USER;
		const url = process.env.DB_URL;
		const password = process.env.DB_PASSWORD;
		const pool = mariadb.createPool({ host: url, user, connectionLimit: 5, password, port, database: db });
		const connection = await pool.getConnection();
		const result = await callback(pool);
		await connection.end();
		await pool.end();
		return result;

	}

	async sqlquery<T>(queryString: string, params: Array<any> = []): Promise<DatabaseResult> {
		return this.query(connection => connection.query(queryString, params));
	}

	async selectQuery<T>(queryString: string, params: Array<any> = []): Promise<Array<T>> {
		return this.query(connection => connection.query(queryString, params));
	}


}