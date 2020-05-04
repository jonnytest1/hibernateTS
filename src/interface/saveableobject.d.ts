import { DataBaseConfig } from '../annotations/database-config';



export interface ISaveAbleObject {
	constructor: {
		prototype: {
			database: DataBaseConfig
		}
	}
}

export interface ConstructorClass<T> {
	new(): T;
}