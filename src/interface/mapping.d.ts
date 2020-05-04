import { Mappings } from './mapping-types';
import { MappingOptions } from '../annotations/database-annotation';
import { ConstructorClass } from './saveableobject';


export interface Mapping {
	target: ConstructorClass<any>;
	column: string;
	type: Mappings;
	options: MappingOptions;
}
