
import { update } from './update';
import { ISaveAbleObject } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';
import { getDBConfig } from './utils';

class Intercept {

	intercept(object: ISaveAbleObject) {
		Object.defineProperty(object, "_dbUpdates", {
			enumerable: false,
			value: [],
			configurable: false
		});


		const db = getDBConfig(object);


		for (let column of db.columns) {
			if (!db.mappings[column]) {
				Object.defineProperty(object, "_" + column, {
					value: object[column],
					writable: true,
					enumerable: false
				});
			}

			const overwrites: PropertyDescriptor & ThisType<any> = {
				get: () => {
					return object["_" + column];
				},
				configurable: true,
				enumerable: true
			};
			if (column !== db.primary) {
				overwrites.set = (value) => {
					const mapping = db.mappings[column];
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
					object["_" + column] = value;
					Object.defineProperty(object, column, overwrites);
					update.pushUpdate(object, update.update(object, column, value))
				}
			} else {
				overwrites.set = (value) => {
					throw "dont set primary"
				}
			}

			Object.defineProperty(object, column, overwrites);



		}

	}

}


export const intercept = new Intercept()