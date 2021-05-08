import { MappingOptions, OneToManyMappingOptions } from '../annotations/database-annotation';

export enum Mappings {
	/**
	 * key is on the target object as backreference 
	 */
	OneToMany,

	/**
	 * key is on the referencing object
	 */
	OneToOne
}

export interface MappingOptionsMap {
	0: OneToManyMappingOptions,
	1: MappingOptions
}