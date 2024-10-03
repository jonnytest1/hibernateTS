import { Mapping } from "../interface/mapping";
import { Mappings } from '../interface/mapping-types';
import { DBColumn, type TableOptions } from './database-annotation';


export type PrimaryType = 'auto-increment' | 'custom'

export interface ColumnDefinition<K = string> {
	modelName: K
	dbTableName: string

	mapping?: Mapping<any>,

	inverseMappingDef?: Array<{
		target: any,
		targetColumn: string,
		inverseMappingType: Mappings
	}>

	primaryType?: PrimaryType,
	opts?: DBColumn
}

export class DataBaseConfig<T = any> {

	modelPrimary: string;
	table: string;
	updates: Promise<number>[];
	columns: { [key in keyof T]?: ColumnDefinition };


	options: TableOptions<T>

	constructor() {
		this.updates = []
		this.columns = {}
	}
}