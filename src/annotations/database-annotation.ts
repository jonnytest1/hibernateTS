
import { DataBaseConfig, PrimaryType } from './database-config';
import { Mappings } from '../interface/mapping-types';
import { getDBConfig } from '../utils';
import { ISaveAbleObject, ConstructorClass } from '../interface/mapping';

function checkPrototype(constructor: any) {
	if (constructor.prototype.database == undefined) {
		constructor.prototype.database = new DataBaseConfig();
	}
}

export function table(name: string) {
	return function (constructor: new () => any) {
		new constructor();
		checkPrototype(constructor)
		getDBConfig(constructor).table = name;
	}
}

export function column(): (...args) => void {
	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor): void {
		checkPrototype(target.constructor)
		const db = getDBConfig(target.constructor);
		if (!db.columns[propertyKey]) {
			db.columns[propertyKey] = {
				modelName: propertyKey,
				dbName: propertyKey
			}
		}
	}
}

export interface primaryOptions {
	strategy?: PrimaryType
}

export function primary(options: primaryOptions = {}): (...args) => void {
	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		column()(target, propertyKey, descriptor);

		const dbConfig = getDBConfig(target.constructor);
		dbConfig.modelPrimary = propertyKey;
		dbConfig.columns[propertyKey].primaryType = options.strategy || 'auto-increment'

	}
}

export interface MappingOptions {
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

export function mapping<T = any>(type: Mappings, model: ConstructorClass<T>, key?: string | ((t: T) => any), options: MappingOptions = {}): (...args) => any {
	const mappingModel = getDBConfig(model);
	let columnKey: string = getColumnKey(mappingModel, model, key)

	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		column()(target, propertyKey, descriptor);
		column()(new model(), key)

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

