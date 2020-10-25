import { Mapping } from "../interface/mapping";
import { DBColumn } from './database-annotation';


export type PrimaryType = 'auto-increment' | 'custom'

export interface ColumnDefinition {
	modelName: string
	dbTableName: string

	mapping?: Mapping,

	inverseMappingDef?: {
		target: any
	}

	primaryType?: PrimaryType,
	opts?: DBColumn
}

export class DataBaseConfig<T = any> {


	modelPrimary: string;
	table: string;
	updates: Promise<number>[];
	columns: { [key in keyof T]?: ColumnDefinition };

	constructor() {
		this.updates = []
		this.columns = {}
	}
}