import { promises } from 'fs';
import { join } from 'path';

import { DataBaseConfig } from './annotations/database-config';
import { Mappings } from './interface/mapping-types';
import { MariaDbBase } from './dbs/mariadb-base';
import { getDBConfig } from './utils';
import type { DataBaseBase, DataBaseBaseStatic } from './dbs/database-base';


type ColumnQuery = {
    COLUMN_NAME: string
    DATA_TYPE: "varchar" | "bigint" | "int" | "mediumint" | "text",
    CHARACTER_MAXIMUM_LENGTH: number
    TABLE_NAME: string
}
type ConstraintQuery = {
    TABLE_NAME: string
    CONSTRAINT_TYPE: "UNIQUE" | "PRIMARY KEY"
    CONSTRAINT_NAME: string
}


type DatabaseGEnerator = DataBaseBaseStatic


interface UpdateOpts {
    dbPoolGEnerator?: DatabaseGEnerator

    modelDb?: string
}


/**
 * change database to fit models
 * @param save 
 */
export async function updateDatabase(modelRootPath: string, opts: UpdateOpts = {}) {

    const modelDb = opts.modelDb ?? process.env.DB_NAME

    const DbBaseClass = opts.dbPoolGEnerator ?? MariaDbBase


    const db = new DbBaseClass("information_schema", 5)
    let tablesDb: DataBaseBase | undefined
    try {
        const [classes, tableSet, columnData, constraints] = await Promise.all([
            loadFiles(modelRootPath),
            db.selectQuery<{ TABLE_NAME: string }>("SELECT TABLE_NAME FROM information_schema.`TABLES` WHERE TABLE_SCHEMA = ?", [modelDb]).then(db => {
                return new Set(db.map(table => table.TABLE_NAME))
            }),
            db.selectQuery<ColumnQuery>("SELECT * FROM information_schema.`COLUMNS` WHERE TABLE_SCHEMA = ? ", [modelDb]).then(columns => {
                const tableColumnMap: { [table: string]: Array<ColumnQuery> } = {}

                for (const column of columns) {
                    tableColumnMap[column.TABLE_NAME] ??= []
                    tableColumnMap[column.TABLE_NAME].push(column)
                }
                return tableColumnMap
            }),
            db.selectQuery<ConstraintQuery>("SELECT * FROM information_schema.`TABLE_CONSTRAINTS` WHERE TABLE_SCHEMA = ? ", [modelDb]).then(constraints => {

                const tableColumnMap: { [table: string]: Array<ConstraintQuery> } = {}

                for (const constraint of constraints) {
                    tableColumnMap[constraint.TABLE_NAME] ??= []
                    tableColumnMap[constraint.TABLE_NAME].push(constraint)
                }
                return tableColumnMap
            })
        ]);
        await new Promise(res => setTimeout(res, 20))


        tablesDb = new DbBaseClass(modelDb, classes.length * 2)
        await Promise.all(classes.map(async classObj => {
            await Promise.all(Object.values(classObj)
                .filter(exp => getDBConfig(exp))
                .map(async dbClass => {

                    const dbConfig = getDBConfig(dbClass);
                    if (!tableSet.has(dbConfig.table)) {
                        await createTable(dbConfig, columnData[dbConfig.table], tablesDb!)
                    } else {
                        const alterTableData = {
                            columnData: columnData[dbConfig.table],
                            constraints: constraints[dbConfig.table]
                        }

                        await alterTable(dbConfig, alterTableData, tablesDb!)

                    }
                })
            )
        }))

        console.log("finsihed db check")

    } finally {
        db?.end()
        tablesDb?.end()
    }
}

async function alterTable(dbConfig: DataBaseConfig, previousData: {
    columnData: Array<ColumnQuery>
    constraints: Array<ConstraintQuery>
}, db: DataBaseBase) {
    let sql = "ALTER TABLE `" + dbConfig.table + "`\r\n"
    let needsAlter = false;

    const queryStrings = db.constructor.queryStrings;
    const columnData = previousData.columnData

    const columnNames = Object.values(dbConfig.columns)
        .map(colDEf => colDEf!.dbTableName);
    const missingColumns = columnNames
        .filter(columName => !columnData.some(colData => colData.COLUMN_NAME == columName) && getColumnSQL(dbConfig, columName) != null);

    missingColumns.forEach(column => {
        needsAlter = true
        sql += " ADD COLUMN " + getColumnSQL(dbConfig, column)
    })

    columnNames
        .filter(columName => columnData.some(colData => colData.COLUMN_NAME == columName) && getColumnSQL(dbConfig, columName) != null)
        .forEach(columnName => {
            const dbColumn = columnData.find(colData => colData.COLUMN_NAME == columnName);
            if (!dbColumn) {
                throw new Error("didnt find db column")
            }
            const serverColumn = Object.values(dbConfig.columns).find(sColumn => sColumn?.dbTableName === columnName)
            if (serverColumn?.opts && serverColumn.opts.size == "small") {
                return;
            }
            if (!serverColumn) {
                throw new Error("didnt find server column")
            }
            const serverType = serverColumn.opts!.type
            const serverSize = serverColumn.opts!.size;
            const dbType = dbColumn.DATA_TYPE;
            const dbSize = dbColumn.CHARACTER_MAXIMUM_LENGTH

            if (serverType == "number") {
                if (serverSize == "large") {
                    if (dbType == "bigint") {
                        //fits
                    } else if (dbType == "int" || dbType == "mediumint") {
                        needsAlter = true;
                        sql += '	CHANGE COLUMN `' + columnName + '` `' + columnName + '` BIGINT,\r\n'
                    } else {
                        debugger;
                    }
                } else if (serverSize == "medium") {
                    if (dbType == "int") {
                        needsAlter = true;
                        sql += '	CHANGE COLUMN `' + columnName + '` `' + columnName + '` MEDIUMINT,\r\n'
                    } else {
                        console.error(`cant handle case number medium for ${dbType},${dbSize} in ${dbConfig.table}`)
                    }
                } else {
                    console.error(`cant handle case ${serverType} ${serverSize} for ${dbType},${dbSize} in ${dbConfig.table}`)
                }

            } else if (serverType == "text") {
                if (serverSize == "large") {
                    //medium / small are both varchar
                    if ((dbType == "varchar" || dbType == "text") && dbType.toUpperCase() !== queryStrings.mediumTextStr) {
                        needsAlter = true;
                        sql += `	CHANGE COLUMN \`${columnName}\` \`${columnName}\` ${queryStrings.mediumTextStr},\r\n`
                    } else {
                        console.error(`cant handle case ${serverType} ${serverSize} for ${dbType},${dbSize} in ${dbConfig.table}`)
                    }
                } else if (serverSize == "medium") {
                    if (dbType == "varchar") {
                        if (dbSize == 50 || dbSize == 512) {
                            needsAlter = true;
                            sql += '	CHANGE COLUMN `' + columnName + '` `' + columnName + '` VARCHAR(2048),\r\n'
                        } else if (dbSize == 512) {
                            //fits
                        } else {
                            console.error(`cant handle case ${serverType} ${serverSize} for ${dbType},${dbSize} in ${dbConfig.table}`)
                        }
                    } else {
                        console.error(`cant handle case ${serverType} ${serverSize} for ${dbType},${dbSize} in ${dbConfig.table}`)
                    }
                } else {
                    console.error(`cant handle case ${serverType} ${serverSize} for ${dbType},${dbSize} in ${dbConfig.table}`)
                }
            } else {
                console.error(`cant handle case ${serverType} ${serverSize} for ${dbType},${dbSize} in ${dbConfig.table}`)
            }



        })

    if (dbConfig.options?.constraints) {

        const neededContraints = Object.fromEntries(dbConfig.options.constraints
            .map(c => [queryStrings.constraintName(c, dbConfig), c]));

        (previousData.constraints ?? []).forEach(c => {
            delete neededContraints[c.CONSTRAINT_NAME]
        });


        const missingConstraints = Object.values(neededContraints);
        if (missingConstraints.length) {
            needsAlter = true
            sql += missingConstraints.map(c => {
                return `ADD ${queryStrings.uniqueConstraintSql(c, undefined, dbConfig)}`
            }).join(",")
            // cause past me decided to add new lines after everything 
            sql += "---"
        }

    }

    sql = sql.substr(0, sql.length - 3) + ";"
    if (needsAlter) {
        console.log(sql);
        await db.sqlquery(dbConfig, sql);
    }
}

async function createTable(dbConfig: DataBaseConfig, columnData: Array<ColumnQuery>, db: DataBaseBase) {
    let sql = ""
    sql += "CREATE TABLE `" + dbConfig.table + "` (\r\n"

    const queryStrings = db.constructor.queryStrings;

    for (let column in dbConfig.columns) {
        const colSql = getColumnSQL(dbConfig, column, true)
        if (colSql !== null) {
            sql += colSql;
        }
    }
    if (dbConfig.modelPrimary) {
        sql += "	PRIMARY KEY (`" + dbConfig.modelPrimary + "`)\n"
    } else if (dbConfig.options?.constraints) {

        sql += dbConfig.options.constraints
            .map(constraint => queryStrings.uniqueConstraintSql(constraint, undefined, dbConfig))
            .join(",\n")
    } else {
        sql = sql.trimEnd().replace(/,$/, "")
    }

    sql += ") COLLATE='utf8mb4_general_ci' ENGINE=InnoDB ;"
    console.log(sql);
    await db.sqlquery(dbConfig, sql);

}

function getColumnSQL(dbConfig: DataBaseConfig, column: string, createMOde?: boolean) {
    let columnSql = ""
    const columnConfig = dbConfig.columns[column];
    if (!columnConfig) {
        throw new Error("no column config")
    }
    const colDbOpts = columnConfig.opts ?? {};

    if (dbConfig.modelPrimary == column) {
        colDbOpts.nullable = false;
    }
    if (colDbOpts.nullable == undefined) {
        colDbOpts.nullable = true
    }

    if (colDbOpts.type == "binding") {
        if (columnConfig.mapping) {
            if (columnConfig.mapping.type == Mappings.OneToMany) {
                return null
            } else if (columnConfig.mapping.type == Mappings.OneToOne) {
                const targetConf = getDBConfig(columnConfig.mapping.target);
                const targetColDbOpts = targetConf.columns[targetConf.modelPrimary]?.opts ?? {}
                colDbOpts.size = targetColDbOpts.size;
                colDbOpts.type = targetColDbOpts.type;
                colDbOpts.nullable = true
                colDbOpts.default = "NULL"
            }
        } else if (columnConfig.inverseMappingDef) {
            const hasOneToOneMapping = columnConfig.inverseMappingDef.some(mappingDef => {
                const targetConf = getDBConfig(mappingDef.target);

                for (let column in targetConf.columns) {
                    const columnMapping = targetConf.columns[column]?.mapping;
                    if (columnMapping) {
                        const backwardConf = getDBConfig(columnMapping.target)
                        if (columnMapping.type == Mappings.OneToOne && backwardConf.table == dbConfig.table) {
                            return true;
                        }
                    }
                }
                return false
            })

            for (let mappingDefIndex = 0; mappingDefIndex < columnConfig.inverseMappingDef.length; mappingDefIndex++) {
                const mappingDef = columnConfig.inverseMappingDef[mappingDefIndex]
                const targetConf = getDBConfig(mappingDef.target);
                const targetColDbOpts = targetConf.columns[targetConf.modelPrimary]?.opts ?? {}

                if (mappingDefIndex > 0) {
                    if (colDbOpts.size != targetColDbOpts.size || colDbOpts.type != targetColDbOpts.type) {
                        throw new Error("multiple mappings with different type or size")
                    }
                }

                colDbOpts.size = targetColDbOpts.size;
                colDbOpts.nullable = hasOneToOneMapping

                if (mappingDef.inverseMappingType != Mappings.OneToOne) {
                    //keep type binding if source of inverse mapping
                    colDbOpts.type = targetColDbOpts.type;

                }
            }
            // return null;
        } else {
            throw "unimplemented exception"
        }
    }

    columnSql += "`" + columnConfig.dbTableName + "` "

    if (!colDbOpts.type) {
        colDbOpts.type = "text";
    }
    if (colDbOpts.type == "text") {
        if (!colDbOpts.size) {
            colDbOpts.size = "small";
        }

        if (colDbOpts.size == "small") {
            columnSql += "    VARCHAR(512) "
        } else if (colDbOpts.size == "medium") {
            columnSql += "    VARCHAR(2048) "
        } else if (colDbOpts.size == "large") {
            columnSql += "    MEDIUMTEXT "
        } else {

            debugger;
        }
    } else if (colDbOpts.type == "number") {
        if (!colDbOpts.size) {
            colDbOpts.size = "medium";
        }

        if (colDbOpts.size == "small") {
            columnSql += "    INT "
        } else if (colDbOpts.size == "medium") {
            columnSql += "    MEDIUMINT "
        } else if (colDbOpts.size == "large") {
            columnSql += "    BIGINT "
        } else {
            debugger;
        }
    } else if (colDbOpts.type == "boolean") {
        columnSql += "    TINYINT "

    } else if (colDbOpts.type == "date") {
        columnSql += "    DATETIME "
    } else if (colDbOpts.type == "binding") {
        if (columnConfig.mapping) {
            if (columnConfig.mapping.type == Mappings.OneToMany) {
                //ignore for reverse Binding
            } else {
                debugger;
            }
        } else if (columnConfig.inverseMappingDef && columnConfig.inverseMappingDef.every(def => def.inverseMappingType === Mappings.OneToMany)) {
            console.log(columnConfig, column)
            // if it  is an inverted mapping we need the column
            return null;
        } else {
            throw "unimplemented exception"
        }
    }

    if (colDbOpts.nullable) {
        columnSql += "NULL "
    } else {
        columnSql += "NOT NULL "
    }
    if (dbConfig.modelPrimary == column && columnConfig.primaryType && columnConfig.primaryType == "auto-increment") {
        columnSql += " AUTO_INCREMENT "
    }
    if (colDbOpts.default) {
        columnSql += " DEFAULT " + colDbOpts.default;
    }



    columnSql += ",\r\n"

    if (dbConfig.modelPrimary == column && columnConfig.primaryType && columnConfig.primaryType == "auto-increment" && !createMOde) {
        columnSql += " ADD PRIMARY KEY (`" + columnConfig.dbTableName + "`),\r\n"
    }

    return columnSql;

}


async function loadFiles(path: string): Promise<Array<any>> {
    const files = await promises.readdir(path);
    const classes: Array<any> = await Promise.all(files.map(async (file) => {
        const absolutePath = join(path, file);
        const stats = await promises.stat(absolutePath);
        if (stats.isFile()) {
            return loadFile(absolutePath);
        } else if (stats.isDirectory()) {
            return await loadFiles(absolutePath);
        }
    }));
    if (!classes.length) {
        return []
    }
    return classes.reduce((a, b) => [...a, ...b]);

}

async function loadFile(absolutePath: string): Promise<Array<any>> {
    if (absolutePath.endsWith('.js') || absolutePath.endsWith('.ts')) {
        const data = await promises.readFile(absolutePath);
        if (data.includes('hibernatets')) {
            return [require(absolutePath)];
        }
    }
    return [];
}