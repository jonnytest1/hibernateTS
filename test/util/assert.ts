export function assert(val1, val2, message: string) {
    if (val1 !== val2) {
        throw new Error("values dont match " + message)
    }
}