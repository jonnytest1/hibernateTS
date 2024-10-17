export function objectValues<T extends object>(obj: T) {
    return Object.values(obj) as Array<T[keyof T]>
}