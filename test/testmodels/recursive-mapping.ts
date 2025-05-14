
import { mapping, Mappings, primary, table } from '../../src/src';
import { TestModelRef } from './test-model';
// from 'hibernatets';
@table()
export class RecursiveMapping {

    @primary()
    id: number

    @mapping(Mappings.OneToOne, import("./test-model").then(i => i.TestModel))

    backwardsMapping: TestModelRef

}