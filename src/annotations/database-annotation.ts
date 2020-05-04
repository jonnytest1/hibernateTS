
import { DataBaseConfig } from './database-config';
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
		if (!db.columns.includes(propertyKey)) {
			db.columns.push(propertyKey)
		}
	}
}

export function primary(): (...args) => void {
	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		column()(target, propertyKey, descriptor);
		getDBConfig(target.constructor).primary = propertyKey;
	}
}

export interface MappingOptions {
	lazyLoad?: boolean
}

export function mapping(type: Mappings, model: ConstructorClass<any>, key?: string, options: MappingOptions = {}): (...args) => void {
	if (!key) {
		key = getDBConfig(model).primary;
	}
	return function (target: ISaveAbleObject, propertyKey: string, descriptor: PropertyDescriptor) {
		column()(target, propertyKey, descriptor);
		column()(new model(), key)
		getDBConfig(target).mappings[propertyKey] = {
			target: model,
			column: key,
			type,
			options: options
		}
	}
}

