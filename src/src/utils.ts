
import { DataBaseConfig, ColumnDefinition } from './annotations/database-config';
import { Mappings } from './interface/mapping-types';
import { ISaveAbleObject, ConstructorClass } from './interface/mapping';

export function setId(object: ISaveAbleObject, id: number) {
	if (object[getDBConfig(object).modelPrimary] !== id) {
		object[getDBConfig(object).modelPrimary] = id;
	}
}

export function getId(object: ISaveAbleObject): number {
	return object[getDBConfig(object).modelPrimary];
}

export function shouldAddColumn(column: ColumnDefinition, db: DataBaseConfig): boolean {
	if (!column) {
		return false;
	}
	if (column.modelName == db.modelPrimary && column.primaryType === 'auto-increment') {
		return false;

	}

	if (column.mapping && column.mapping.type === Mappings.OneToMany) {
		//inverse mapping 
		return false;
	}
	if (column.mapping && column.mapping.type === Mappings.OneToOne) {
		//forward mapping 
		return true;
	}
	return true;

}

export function getRepresentation(object: ISaveAbleObject): { [key: string]: any } {
	const db = getDBConfig(object);


	let representation = {};
	for (let columnName in db.columns) {
		const column = db.columns[columnName]
		if (shouldAddColumn(column, db)) {
			representation[column.modelName] = object[column.modelName];
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