import { remove } from '..';
import { save } from '../save';
import { ExtendedMapItem } from './extended-map-item';

export class ExtendedMap<T extends ExtendedMapItem<any, any>> extends Map<string, ExtendedMapItem> {

    constructor(private itemClass: new () => T, private parentArray: Array<T> = []) {
        super();
        for (let item of parentArray) {
            this.set(item.key, item)
        }
    }
    getValue(key: T["key"]): T["value"] {
        return this.get(key).value
    }


    setValue(key: T["key"], val: T["value"]) {
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

    forEachValue(callbackfn: (value: T["value"], key: T["key"], map: ExtendedMap<T>) => void) {
        this.forEach((val, key, map) => {
            callbackfn(val.value, key, this)
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