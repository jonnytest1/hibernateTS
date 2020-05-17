import { Mapping } from "../interface/mapping";


export type PrimaryType = 'auto-increment' | 'custom'

export interface ColumnDefinition {
	modelName: string
	dbName: string

	mapping?: Mapping

	primaryType?: PrimaryType
}

export class DataBaseConfig {


	modelPrimary: string;
	table: string;
	updates: Promise<number>[];
	columns: { [key: string]: ColumnDefinition };

	constructor() {
		this.updates = []
		this.columns = {}
	}
}