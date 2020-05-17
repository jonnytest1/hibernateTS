
import { DataBaseConfig, PrimaryType } from './database-config';
import { ISaveAbleObject, ConstructorClass } from '../interface/saveableobject';
import { Mappings } from '../interface/mapping-types';
import { getDBConfig } from '../utils';

function checkPrototype(constructor: any) {
	if (constructor.prototype.database == undefined) {
		constructor.prototype.database = new DataBaseConfig();
	}
}

export function table(name: string) {
	return function (constructor: Function) {
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

export function mapping(type: Mappings, model: ConstructorClass<any>, key?: string, options: MappingOptions = {}): (...args) => void {
	if (!key) {
		key = getDBConfig(model).modelPrimary;
	}
	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		column()(target, propertyKey, descriptor);
		column()(new model(), key)


		const columnDef = getDBConfig(target).columns[propertyKey];
		const mappingColumnDef = getDBConfig(model).columns[key];
		columnDef.mapping = {
			target: model,
			column: mappingColumnDef,
			type,
			options: options
		}
	}
}

