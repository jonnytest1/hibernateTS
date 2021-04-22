
import { DataBaseConfig, ColumnDefinition } from './annotations/database-config';
import { Mappings } from './interface/mapping-types';
import { ISaveAbleObject, ConstructorClass } from './interface/mapping';

export type CustomOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

export function setId(object: ISaveAbleObject, id: number) {
	if (object[getDBConfig(object).modelPrimary] !== id) {
		object[getDBConfig(object).modelPrimary] = id;
	}
}

export function getId(object: ISaveAbleObject): number {
	return object[getDBConfig(object).modelPrimary];
}

export function isPersisted(object: ISaveAbleObject): boolean {

	return !!object.___persisted;
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

export function getRepresentation(object: ISaveAbleObject): { [key: string]: unknown } {
	const db = getDBConfig(object);


	let representation = {};
	for (let columnName in db.columns) {
		const column = db.columns[columnName]
		if (shouldAddColumn(column, db)) {
			if (column.mapping && column.mapping.type == Mappings.OneToOne && object[column.modelName]) {
				representation[`\`${column.modelName}\``] = getId(object[column.modelName])
			} else {
				representation[`\`${column.modelName}\``] = object[column.modelName];
			}
		}
	}
	return representation;
}


export function getDBConfig<T = any>(obj: ISaveAbleObject | ConstructorClass<any> | T): DataBaseConfig<T> {
	if ((obj as ConstructorClass<any>).prototype && (obj as ConstructorClass<any>).prototype.database) {
		return (obj as ConstructorClass<any>).prototype.database;
	}
	return obj.constructor.prototype.database;
}

