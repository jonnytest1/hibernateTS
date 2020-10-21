
import { DataBaseConfig, PrimaryType } from './database-config';
import { Mappings } from '../interface/mapping-types';
import { CustomOmit, getDBConfig } from '../utils';
import { ISaveAbleObject, ConstructorClass } from '../interface/mapping';

export interface DBColumn {
	/**
	 * binding uses primary Key type or BigInt as default 
	 */
	type?: "text" | "number" | "boolean" | "date" | "binding",
	size?: "small" | "medium" | "large"

	nullable?: boolean,
	default?: string
}


function checkPrototype(constructor: any) {
	if (constructor.prototype.database == undefined) {
		constructor.prototype.database = new DataBaseConfig();
	}
}

export interface TableOptions {
	/**
	 * @default constructor.name.toLowerCase()
	 */
	name?: string
	/**
	 * @default "utf8mb4_general_ci"
	 */
	collation?: string
}

export function table(opts: TableOptions = {}) {
	return function (constructor: new () => any) {
		if (!opts.name) {
			opts.name = constructor.name.toLowerCase();
		}
		if (!opts.collation) {
			opts.collation = "utf8mb4_general_ci"
		}

		new constructor();
		checkPrototype(constructor)
		getDBConfig(constructor).table = opts.name;
	}
}
export interface ColumnOption extends DBColumn {

}


export function column(opts: ColumnOption = {}): (target: ISaveAbleObject, propertyKey: string, descriptor?: PropertyDescriptor) => any {
	return function (target: ISaveAbleObject, propertyKey: string, descriptor?: PropertyDescriptor): void {
		checkPrototype(target.constructor)
		const db = getDBConfig(target.constructor);
		if (!db.columns[propertyKey]) {
			db.columns[propertyKey] = {
				modelName: propertyKey,
				dbTableName: propertyKey,
				opts: opts
			}
		}
	}
}

export interface primaryOptions extends DBColumn {
	strategy?: PrimaryType
}

export function primary(options: primaryOptions = {}): (...args) => void {
	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		if (!options.strategy) {
			options.strategy = "auto-increment";
		}
		if (options.strategy == "auto-increment") {
			options.type = "number";
			options.size = "large"
		} else if (options.strategy == "custom") {
			options.type = "text"
		}

		column(options)(target, propertyKey, descriptor);

		const dbConfig = getDBConfig(target.constructor);
		dbConfig.modelPrimary = propertyKey;
		dbConfig.columns[propertyKey].primaryType = options.strategy

	}
}

export interface MappingOptions extends DBColumn {
	lazyLoad?: boolean
}

function getColumnKey(mappingModel, model: ConstructorClass<any>, key?: string | ((t: any) => any)): string {
	if (!key) {
		return mappingModel.modelPrimary;
	} else if (typeof key == "function") {
		const testobject = new model();
		for (let column in mappingModel.columns) {
			testobject[column] = column;
		}
		return key(testobject) as string;
	}
	return key;
}

export function mapping<T = any>(type: Mappings, model: ConstructorClass<T>, key?: string | ((t: T) => any), options?: MappingOptions): (...args) => any {
	const mappingModel = getDBConfig(model);
	let columnKey: string = getColumnKey(mappingModel, model, key)
	if (!columnKey) {
		throw "couldnt find defined key in " + model.name + " make sure it has an annotation (column /primary/ mapping)"
	}
	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		if (!options) {
			options = {
				type: "binding"
			}
		}

		column(options)(target, propertyKey, descriptor);
		column(options)(new model(), columnKey)

		const columnDef = getDBConfig(target).columns[propertyKey];
		const mappingColumnDef = getDBConfig(model).columns[columnKey];
		columnDef.mapping = {
			target: model,
			column: mappingColumnDef,
			type,
			options: options
		}
	}
}

