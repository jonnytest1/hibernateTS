
import { update, pushUpdate } from './update';
import { ISaveAbleObject } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';
import { getDBConfig } from './utils';

export function intercept(object: ISaveAbleObject) {
	Object.defineProperty(object, "_dbUpdates", {
		enumerable: false,
		value: [],
		configurable: false
	});


	const db = getDBConfig(object);


	for (let column of Object.values(db.columns)) {
		if (!column.mapping) {
			Object.defineProperty(object, "_" + column.modelName, {
				value: object[column.modelName],
				writable: true,
				enumerable: false
			});
		}

		const overwrites: PropertyDescriptor & ThisType<any> = {
			get: () => {
				return object["_" + column.modelName];
			},
			configurable: true,
			enumerable: true
		};
		if (column.modelName !== db.modelPrimary) {
			overwrites.set = (value) => {
				const mapping = column.mapping;
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
		} else {
			overwrites.set = (value) => {
				throw "dont set primary"
			}
		}

		Object.defineProperty(object, column.modelName, overwrites);



	}

}