import { column, mapping, Mappings, primary } from '../../src/src';
import { MappingCreate } from './mappingcreate';
import { table } from "hibernatets"
import { RecursiveMapping } from './recursive-mapping';
@table()
export class TestModel {

	@primary({ strategy: 'custom' })
	id: string

	@column()
	col2

	@column({ size: "large" })
	description


	@column()
	randomtext: string

	@column({ type: "boolean" })
	booleanIncTest: boolean

	@column({ type: "number", size: "large" })
	numberIncTest


	@column({ type: "text", size: "medium" })
	textIncTest


	@mapping(Mappings.OneToOne, MappingCreate)
	mappinglevel2: MappingCreate

	@mapping(Mappings.OneToMany, RecursiveMapping, "testmodelRef")
	recursiveMappings: Array<RecursiveMapping> = []

	@mapping(Mappings.OneToOne, TestModel)
	parent: TestModel

	@column({
		type: "date"
	})
	timestamp: Date

	constructor(id?, col?) {
		this.id = id
		this.col2 = col;
	}
}

export interface TestModelRef extends TestModel {
	//
}