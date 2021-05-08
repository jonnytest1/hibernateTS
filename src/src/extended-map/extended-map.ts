import { remove } from '..';
import { save } from '../save';
import { ExtendedMapItem } from './extended-map-item';



export class ExtendedMap<T extends ExtendedMapItem<string, any>, ValueMap extends { [key in T["key"]]: T["value"] } = {
    [key in T["key"]]: string
}> extends Map<string, ExtendedMapItem> {

    constructor(private itemClass: new () => T, private parentArray: Array<T> = []) {
        super();
        for (let item of parentArray) {
            this.set(item.key, item)
        }
    }
    getValue<K extends T["key"]>(key: K): ValueMap[K] {
        return this.get(key).value as ValueMap[K]
    }


    setValue<K extends T["key"]>(key: K, val: ValueMap[K]) {
        const attribute = this.get(key);
        if (attribute) {
            attribute.value = val;
        } else {
            const item = new this.itemClass()
            item.key = key
            this.set(key, item);
            item.value = val;
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