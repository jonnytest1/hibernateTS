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


    @column()
    valueCol: string

    constructor(t1?, t2?, val?) {
        if (t1) {
            this.test1 = t1
            this.test2 = t2
            this.valueCol = val
        }
    }

}