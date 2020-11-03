
import { promises } from 'fs';
import { join } from 'path';
import { DBColumn, queries } from '.';
import { DataBaseConfig } from './annotations/database-config';
import { Mappings } from './interface/mapping-types';
import { DataBaseBase } from './mariadb-base';
import { getDBConfig } from './utils';
/**
 * change database to fit models
 * @param save 
 */
export async function updateDatabase(modelRootPath: string, save = true) {

    const db = new DataBaseBase()
    const classes = await loadFiles(modelRootPath);
    await Promise.all(classes.map(async classObj => {
        await Promise.all(Object.values(classObj)
            .filter(exp => getDBConfig(exp))
            .map(async dbClass => {
                const dbConfig = getDBConfig(dbClass);
                const [tableData, columnData] = await Promise.all([
                    db.selectQuery<any>("SELECT * FROM `TABLES` WHERE `TABLES`.TABLE_NAME = ? ", [dbConfig.table], "information_schema"),
                    db.selectQuery<any>("SELECT * FROM `COLUMNS` WHERE TABLE_NAME = ? ", [dbConfig.table], "information_schema")
                ])
                if (tableData.length == 0) {
                    await createTable(dbConfig, columnData, db)
                } else {
                    await alterTable(dbConfig, columnData, db)

                }
            })
        )
    }))

    console.log("finsihed db check")
}

async function alterTable(dbConfig: DataBaseConfig, columnData: Array<any>, db: DataBaseBase) {
    let sql = "ALTER TABLE `" + dbConfig.table + "`\r\n"
    let needsAlter = false;


    const columnNames = Object.values(dbConfig.columns)
        .map(colDEf => colDEf.dbTableName);
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
            const serverColumn = Object.values(dbConfig.columns).find(sColumn => sColumn.dbTableName === columnName)
            if (serverColumn.opts && serverColumn.opts.size == "small") {
                return;
            }

            const serverType = serverColumn.opts.type
            const serverSize = serverColumn.opts.size;
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
                    if (dbType == "varchar") {
                        needsAlter = true;
                        sql += '	CHANGE COLUMN `' + columnName + '` `' + columnName + '` MEDIUMTEXT,\r\n'
                    } else if (dbType == "text") {
                        //fits
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

    sql = sql.substr(0, sql.length - 3) + ";"
    if (needsAlter) {
        console.log(sql);
        await db.sqlquery(sql);
    }
}

async function createTable(dbConfig: DataBaseConfig, columnData: Array<any>, db: DataBaseBase) {
    let sql = ""
    sql += "CREATE TABLE `" + dbConfig.table + "` (\r\n"
    for (let column in dbConfig.columns) {
        const colSql = getColumnSQL(dbConfig, column, true)
        if (colSql !== null) {
            sql += colSql;
        }
    }
    sql += "	PRIMARY KEY (`" + dbConfig.modelPrimary + "`)\n"
    sql += ") COLLATE='utf8_general_ci' ENGINE=InnoDB ;"
    console.log(sql);
    await db.sqlquery(sql);

}

function getColumnSQL(dbConfig: DataBaseConfig, column: string, createMOde?: boolean) {
    let columnSql = ""
    const columnConfig = dbConfig.columns[column];
    const colDbOpts = columnConfig.opts;

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
                const targetColDbOpts = targetConf.columns[targetConf.modelPrimary].opts
                colDbOpts.size = targetColDbOpts.size;
                colDbOpts.type = targetColDbOpts.type;
                colDbOpts.nullable = true
                colDbOpts.default = "NULL"
            }
        } else if (columnConfig.inverseMappingDef) {
            return null;
            const targetConf = getDBConfig(columnConfig.inverseMappingDef.target);
            const targetColDbOpts = targetConf.columns[targetConf.modelPrimary].opts
            colDbOpts.size = targetColDbOpts.size;
            colDbOpts.type = targetColDbOpts.type;
            colDbOpts.nullable = false
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
        debugger;

    } else if (colDbOpts.type == "date") {
        debugger;

    } else if (colDbOpts.type == "binding") {
        if (columnConfig.mapping) {
            if (columnConfig.mapping.type == Mappings.OneToMany) {
                //ignore for reverse Binding
            } else {
                debugger;
            }
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
    const classes = await Promise.all(files.map(async (file) => {
        const absolutePath = join(path, file);
        const stats = await promises.stat(absolutePath);
        if (stats.isFile()) {
            return loadFile(absolutePath);
        } else if (stats.isDirectory()) {
            return await loadFiles(absolutePath);
        }
    }));
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