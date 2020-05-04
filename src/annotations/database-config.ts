import { Mapping } from "../interface/mapping";


export class DataBaseConfig {


	primary: string;
	table: string;
	updates: Promise<number>[];
	columns: string[];
	mappings: { [key: string]: Mapping };

	constructor() {
		this.updates = []
		this.columns = []
		this.mappings = {}
	}
}