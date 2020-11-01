import { column, mapping, Mappings, primary } from '../../src/src';
import { MappingCreate } from './mappingcreate';
import { table } from "hibernatets"
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


	@mapping(Mappings.OneToOne, MappingCreate)
	mappinglevel2: MappingCreate

	constructor(id?, col?) {
		this.id = id
		this.col2 = col;
	}
}