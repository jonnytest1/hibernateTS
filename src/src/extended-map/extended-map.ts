
import { ExtendedMapItem } from './extended-map-item';



export class ExtendedMap<T extends ExtendedMapItem<string, any>, ValueMap extends { [key in T["key"]]: T["value"] } = {
    [key in T["key"]]: any
}> extends Map<T["key"], ExtendedMapItem<T["key"], ValueMap[T["key"]]>> {

    constructor(private itemClass: new () => T, private parentArray: Array<T> = []) {
        super();
        for (let item of parentArray) {
            this.set(item.key, item)
        }
    }
    getValue<K extends T["key"]>(key: K): ValueMap[K] {
        return JSON.parse(this.get(key).value);
    }


    get<K extends T["key"]>(key: K): T {
        return super.get(key) as T
    }

    setValue<K extends T["key"]>(key: K, val: ValueMap[K]) {
        const attribute = this.get(key);
        if (attribute) {
            attribute.value = JSON.stringify(val);
        } else {
            const item = new this.itemClass()
            item.key = key
            this.set(key, item);
            item.value = JSON.stringify(val);
            this.parentArray.push(item);
        }
    }

    entryValues(): IterableIterator<T["value"]> {
        const baseIterator = this.entries()

        const iterator = {
            next: () => {
                const item = baseIterator.next()
                return item?.value;
            },
            *[Symbol.iterator]() {
                yield baseIterator.next()?.value
            }
        }
        return iterator

    }

    forEachValue(callbackfn: <K extends T["key"]>(value: ValueMap[K], key: K, map: ExtendedMap<T>) => void) {
        this.forEach((val, key, map) => {
            callbackfn(val.value as ValueMap[string], key, this)
        })
    }

    delete(key: T["key"]): boolean {
        this.parentArray = this.parentArray.filter(item => item.key !== key)
        return super.delete(key)
    }

    clear() {
        super.clear()
        this.parentArray = this.parentArray.filter(i => false);
    }

    __getItemRef() {
        return this.parentArray
    }
}


interface NewType {
    test: "test1" | "test2";
    hallo: "test2" | "abd";


    fritzh: 123 | 456
}

let t: ExtendedMap<ExtendedMapItem<keyof NewType>, NewType>


t.getValue("fritzh")