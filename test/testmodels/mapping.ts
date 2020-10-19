import { mapping, Mappings } from 'hibernatets';
import { TestModel } from './example';

export class ClWithMApping {

	@mapping(Mappings.OneToMany, TestModel, t => t.col2)
	test: Array<TestModel>

	constructor() {

	}
}