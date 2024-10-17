import { column, primary, table } from '../../src/src'

// hibernatets
@table({
    constraints: [{
        type: "unique",
        columns: ["test2"]
    }]
})
export class TestModelNoPrimaryAndUnique {

    @primary()
    test1


    @column()
    test2


    @column()
    valueCol: string



    @column({ type: "boolean" })
    valueTwo: boolean

    constructor(t1?, t2?, val?) {
        if (t1) {
            this.test1 = t1
            this.test2 = t2
            this.valueCol = val
        }
    }

}