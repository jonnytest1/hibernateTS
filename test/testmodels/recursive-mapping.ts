import { primary, table } from 'hibernatets';
import { mapping, Mappings } from '../../src/src';
import { TestModelRef } from './test-model';

@table()
export class RecursiveMapping {

    @primary()
    id: number

    @mapping(Mappings.OneToOne, import("./test-model").then(i => i.TestModel))

    backwardsMapping: TestModelRef
}