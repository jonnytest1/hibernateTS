import { DataBaseBase } from '../../src/src/mariadb-base'

export async function calldWithCount<T>(cb: () => Promise<T>, amount: number) {
    let queryCount = DataBaseBase.queryCt
    const result = await cb();
    if (queryCount + amount !== DataBaseBase.queryCt) {
        throw `didnt load stuff efficiently expected ${amount} but got ${DataBaseBase.queryCt - queryCount}`;
    }
    return result
}