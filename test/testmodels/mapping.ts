import { mapping, Mappings, primary, table } from 'hibernatets';
import { TestModel } from './example';

@table("examplemapping")
export class ClWithMApping {

	@mapping(Mappings.OneToMany, TestModel, t => t.col2)
	test: Array<TestModel>

	@mapping(Mappings.OneToOne, TestModel, t => t.col2)
	test2: TestModel

	@primary()
	id

	constructor() {

	}
}