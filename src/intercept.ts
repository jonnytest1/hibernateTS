
import { update, pushUpdate } from './update';
import { Mappings } from './interface/mapping-types';
import { getDBConfig, getId } from './utils';
import { ISaveAbleObject } from './interface/mapping';
import { save } from '.';

export function intercept(object: ISaveAbleObject) {
	Object.defineProperty(object, "_dbUpdates", {
		enumerable: false,
		value: [],
		configurable: false
	});

	const db = getDBConfig(object);

	for (let column of Object.values(db.columns)) {
		Object.defineProperty(object, "_" + column.modelName, {
			value: object[column.modelName],
			writable: true,
			enumerable: false
		});

		const overwrites: PropertyDescriptor & ThisType<any> = {
			get: () => {
				return object["_" + column.modelName];
			},
			configurable: true,
			enumerable: true
		};
		if (column.modelName !== db.modelPrimary) {
			const mapping = column.mapping;
			overwrites.set = (value) => {
				if (mapping) {
					if (mapping.type === Mappings.OneToMany) {
						if (value instanceof Array) {
							value = value.map(val => {
								if (val instanceof mapping.target) {
									return val;
								} else {
									const newVal = new mapping.target();
									for (let i in val) {
										newVal[i] = val[i];
									}
									return newVal;
								}
							})
						} else {
							throw "wrong type for mapping"
						}
					} else {
						throw "unimplemented "
					}
				}
				object["_" + column.modelName] = value;
				Object.defineProperty(object, column.modelName, overwrites);
				pushUpdate(object, update(object, column.modelName, value))
			}
			interceptArray(object, column.modelName)


		} else {
			overwrites.set = (value) => {
				throw "dont set primary"
			}
		}

		Object.defineProperty(object, column.modelName, overwrites);



	}

}


function interceptArray(object: ISaveAbleObject, column: string) {
	const mapping = getDBConfig(object).columns[column].mapping;
	const obj = object[column];
	if (mapping && obj instanceof Array) {
		obj.push = new Proxy(obj.push, {
			apply: (target, thisArg, argumentsList) => {
				const items = argumentsList[0];
				items.forEach(item => {
					item[mapping.column.modelName] = getId(object)
				})
				pushUpdate(object, save(items));
				return target.call(obj, items);
			}
		})
	}


}