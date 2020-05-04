
import { DataBaseConfig } from './annotations/database-config';
import { ISaveAbleObject, ConstructorClass } from './interface/saveableobject';
import { Mappings } from './interface/mapping-types';

export function setId(object: ISaveAbleObject, id: number) {
	object[getDBConfig(object).primary] = id;
}


export function getId(object: ISaveAbleObject): number {
	return object[getDBConfig(object).primary];
}


export function shouldAddColumn(column, db: DataBaseConfig): boolean {
	if (!column) {
		return false;
	}
	if (column == db.primary) {
		//autoincrement prob
		return false;

	}

	if (db.mappings[column] && db.mappings[column].type === Mappings.OneToMany) {
		//inverse mapping 
		return false;
	}

	return true;

}

export function getRepresentation(object: ISaveAbleObject) {
	const db = getDBConfig(object);


	let representation = {};
	for (let column of db.columns) {
		if (this.shouldAddColumn(column, db)) {
			representation[column] = object[column];
		}
	}
	return representation;
}


export function getDBConfig(obj: ISaveAbleObject | ConstructorClass<any>): DataBaseConfig {
	if ((obj as ConstructorClass<any>).prototype && (obj as ConstructorClass<any>).prototype.database) {
		return (obj as ConstructorClass<any>).prototype.database;
	}
	return obj.constructor.prototype.database;
}