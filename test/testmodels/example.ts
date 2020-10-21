import { primary, table, column } from 'hibernatets';

@table()
export class TestModel {

	@primary({ strategy: 'custom' })
	id

	@column()
	col2

	@column({ size: "large" })
	description


	@column()
	randomtext: string

	@column({ type: "number", size: "large" })
	numberIncTest


	@column({ type: "text", size: "medium" })
	textIncTest

	constructor(id?, col?) {
		this.id = id
		this.col2 = col;
	}
}