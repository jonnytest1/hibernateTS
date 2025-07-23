
import { column, mapping, Mappings, primary, reference, table } from '../../src/src';
import { TestModel } from './test-model';
import { MappingCreate } from './mappingcreate';
// from "hibernatets"
@table()
export class ClWithMApping {

	@mapping(Mappings.OneToMany, TestModel, "clref")
	test: Array<TestModel> = []

	@mapping(Mappings.OneToOne, TestModel, t => t.col2)
	test2: TestModel

	@primary()
	id: number

	@mapping(Mappings.OneToOne, MappingCreate)
	mappingcreate: MappingCreate

	@column()
	idKey: string

	@reference()
	references: Record<keyof this, number>

	constructor(idKey?: string) {
		if (idKey) {
			this.idKey = idKey
		}
	}
}