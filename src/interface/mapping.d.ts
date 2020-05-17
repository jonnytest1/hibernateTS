import { Mappings } from './mapping-types';
import { MappingOptions } from '../annotations/database-annotation';
import { ConstructorClass } from './saveableobject';
import { ColumnDefinition } from '../annotations/database-config';


export interface Mapping {
	target: ConstructorClass<any>;
	column: ColumnDefinition;
	type: Mappings;
	options: MappingOptions;
}
