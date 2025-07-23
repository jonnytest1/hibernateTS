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

	static CREATION_STACK?: string
	modelPrimary: string;
	table: string;
	updates: Promise<number>[];
	columns: { [key in keyof T]?: ColumnDefinition };


	options: TableOptions<T>

	referenceKey: keyof T & string

	stack: string

	constructor(private tableConstructor: new () => T) {
		this.updates = []
		this.columns = {}
		try {
			throw new Error("database-creation")
		} catch (e) {
			this.stack = DataBaseConfig.CREATION_STACK ?? e.stack.split("\n").slice(4).join("\n")
		}
	}


	public createInstance() {
		if (this.options?.usePrototypeAssignInsteadOf0ArgsConstructor) {
			const obj = {}
			Object.setPrototypeOf(obj, this.tableConstructor)
			return obj as T
		}
		return new this.tableConstructor()
	}
}