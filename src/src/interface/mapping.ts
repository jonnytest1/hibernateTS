import { MappingOptionsMap, Mappings } from './mapping-types';
import { MappingOptions } from '../annotations/database-annotation';
import { ColumnDefinition, DataBaseConfig } from '../annotations/database-config';


export interface Mapping<T extends Mappings> {
	target: ConstructorClass<any>;
	column: ColumnDefinition;
	type: T;
	options: MappingOptionsMap[T];
}



export interface ISaveAbleObject {
	constructor: {
		prototype: {
			database: DataBaseConfig
		}
	}

	___persisted?: boolean
}

export interface ConstructorClass<T> {
	new(): T;

	new(...args): T;
}
