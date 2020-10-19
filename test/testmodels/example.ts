import { primary, table, column } from 'hibernatets';

@table("example")
export class TestModel {

	@primary({ strategy: 'custom' })
	id

	@column()
	col2



	constructor(id?, col?) {
		this.id = id
		this.col2 = col;
	}
}