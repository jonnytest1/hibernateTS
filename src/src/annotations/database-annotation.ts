
import { ColumnDefinition, DataBaseConfig, PrimaryType } from './database-config';
import { Mappings } from '../interface/mapping-types';
import { CustomOmit, getDBConfig } from '../utils';
import { ISaveAbleObject, ConstructorClass } from '../interface/mapping';
import { isFunction } from 'util';

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

export const tableClassess: { [key: string]: Function } = {}

export function table(opts: TableOptions = {}) {
	return function (constructor: new () => any) {
		if (!opts.name) {
			opts.name = constructor.name.toLowerCase();
		}
		if (!opts.collation) {
			opts.collation = "utf8mb4_general_ci"
		}
		if (opts.name.includes("'")) {
			throw "invalid characters in name " + opts.name;
		}
		if (tableClassess[opts.name]) {
			throw "duplicate table " + opts.name
		}
		tableClassess[opts.name] = constructor
		new constructor();
		checkPrototype(constructor)
		getDBConfig(constructor).table = opts.name;
	}
}
export interface ColumnOption extends DBColumn {
	transformations?: Transformations<any>
}

export interface Transformations<T, U = any> {
	loadFromDbToProperty: (dbData: U) => Promise<T>;

	saveFromPropertyToDb: (obj: T) => Promise<U>
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

export interface MappingOptions extends DBColumn {
	lazyLoad?: boolean
}


export interface OneToManyMappingOptions extends MappingOptions {
	/**
	 * @default "list"
	 */
	loadType?: "list" | "map"
}


export function mapping<T>(type: Mappings.OneToOne, model: ConstructorClass<T> | Promise<ConstructorClass<T>>, key?: string | ((t: T) => any), options?: MappingOptions)
export function mapping<T>(type: Mappings.OneToMany, model: ConstructorClass<T> | Promise<ConstructorClass<T>>, key: string | ((t: T) => any), options?: OneToManyMappingOptions)
export function mapping<T = any>(type: Mappings, model: ConstructorClass<T> | Promise<ConstructorClass<T>>, key?: string | ((t: T) => any), options: MappingOptions = {}): (...args) => any {

	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		if (model == undefined) {
			console.error(`couldnt get instance for key ${propertyKey} in class ${target.constructor.name} 
			this might be due to circular dependencies 
			    use type imports to prevent just using a type from getting the class instance (tsconfig.json#compilerOptions.importsNotUsedAsValues)
				=> use 'import("./test-model").then(i => i.TestModel)' instead of 'TestModel' with synchronous import
			`)
			throw new Error()
		}
		setTimeout(async () => {
			try {

				let m: ConstructorClass<T> = await model;

				const mappingModel = getDBConfig(m);
				let columnKey: string = getColumnKey(mappingModel, m, key)
				if (!columnKey) {
					throw "couldnt find defined key in " + m.name + " make sure it has an annotation (column /primary/ mapping)"
				}
				if (!options.type) {
					options.type = "binding"
				}

				column(options)(target, propertyKey, descriptor);
				column({ ...options })(new m(), columnKey)

				const columnDef = getDBConfig(target).columns[propertyKey];
				const mappingColumnDef: ColumnDefinition = getDBConfig(m).columns[columnKey];

				columnDef.mapping = {
					target: m,
					column: mappingColumnDef,
					type,
					options: options
				}
				if (!mappingColumnDef.inverseMappingDef) {
					mappingColumnDef.inverseMappingDef = []
				}

				mappingColumnDef.inverseMappingDef.push({
					target: target,
					targetColumn: propertyKey,
					inverseMappingType: type
				})
			} catch (e) {
				console.error(e)
			}
		}, 10)

	}
}

