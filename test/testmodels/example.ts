import { primary, table, column } from 'hibernatets';

@table()
export class TestModel {

	@primary({ strategy: 'custom' })
	id

	@column()
	col2

	@column({ size: "medium" })
	description


	@column()
	randomtext: string


	constructor(id?, col?) {
		this.id = id
		this.col2 = col;
	}
}