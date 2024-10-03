import { column, table } from '../../src/src'

// hibernatets
@table({
    constraints: [{
        type: "unique",
        columns: ["test1", "test2"]
    }]
})
export class TestModelNoPrimary {

    @column()
    test1


    @column()
    test2

}