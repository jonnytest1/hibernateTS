import { mapping, Mappings, primary, table } from 'hibernatets';
import { TestModel } from './example';
import { MappingCreate } from './mappingcreate';

@table()
export class ClWithMApping {

	@mapping(Mappings.OneToMany, TestModel, "clref")
	test: Array<TestModel> = []

	@mapping(Mappings.OneToOne, TestModel, t => t.col2)
	test2: TestModel

	@primary()
	id

	@mapping(Mappings.OneToOne, MappingCreate)
	mappingcreate: Array<MappingCreate>

	constructor() {

	}
}