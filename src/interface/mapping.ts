import { Mappings } from './mapping-types';
import { MappingOptions } from '../annotations/database-annotation';
import { ColumnDefinition, DataBaseConfig } from '../annotations/database-config';


export interface Mapping {
	target: ConstructorClass<any>;
	column: ColumnDefinition;
	type: Mappings;
	options: MappingOptions;
}



export interface ISaveAbleObject {
	constructor: {
		prototype: {
			database: DataBaseConfig
		}
	}
}

export interface ConstructorClass<T> {
	new(): T;

	new(...args): T;
}
