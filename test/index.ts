

import { config } from "dotenv"
import { testDuplicate } from './test/duplicateupdate'
import { testloadbyparam } from './test/testloadbyparam'
import { testmapping } from './test/testmapping'

import { updateDatabase } from "../src/src/db"
import { testloaddeep } from './test/testloaddeep'
import { testsave } from './test/testsave'
import { testDbTransformer } from './test/test-db-transformer'
import { testRecursiveMappings } from './test/test-recurisve-mappings'
import { testMAp } from './testmodels/mapped-models/test-map-mapping'
import { testlaodCalls } from './test/testloadcalls'
import { DataBaseBase, openPools } from '../src/src/mariadb-base'
config()

const native = new DataBaseBase(undefined, 20);
const infoSChemaBase = new DataBaseBase("information_schema");


(async () => {

	//await native.sqlquery("DROP TABLE `example`;")
	//await native.sqlquery("DROP TABLE `examplemapping`;")
	await native.selectQuery<any>("ALTER TABLE `recursivemapping` DROP COLUMN IF EXISTS `testmodelRef`")

	await updateDatabase(`${__dirname}/testmodels`)
	const columns = await infoSChemaBase.selectQuery<any>("SELECT * FROM `COLUMNS` WHERE TABLE_NAME = ? ", ["testmodel"])
	const recursivemappingColumns = await infoSChemaBase.selectQuery<any>("SELECT * FROM `COLUMNS` WHERE TABLE_NAME = ? ", ["recursivemapping"])
	infoSChemaBase.end()
	if (columns.some(c => c.COLUMN_NAME == "recursiveMappings")) {
		await native.selectQuery<any>("ALTER TABLE `testmodel` DROP COLUMN `recursiveMappings`")
		throw "created OneToMany COlumn in source table"
	}
	if (!recursivemappingColumns.some(c => c.COLUMN_NAME == "testmodelRef")) {
		throw "didnt create inverse mapp column in target table"
	}
	for (let testFnc of [testlaodCalls, testloaddeep, testMAp, testRecursiveMappings, testsave, testmapping, testDuplicate,
		testloadbyparam, testDbTransformer]) {
		try {
			await Promise.all([
				native.sqlquery("TRUNCATE TABLE `testmodel`;"),
				native.sqlquery("TRUNCATE TABLE `clwithmapping`;"),
				native.sqlquery("TRUNCATE TABLE `mappingcreate`;"),
				native.sqlquery("TRUNCATE TABLE `recursivemapping`;"),
				native.sqlquery("TRUNCATE TABLE `attributeitem`;")

			])
		} catch (e) {
			console.error(e);
			return;
		}
		console.log(testFnc.name)
		//	await native.sqlquery("CREATE TABLE `example` (`id` VARCHAR(50) NOT NULL COLLATE 'utf8_general_ci',	`col2` VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8_general_ci',	PRIMARY KEY (`id`) USING BTREE)COLLATE='utf8_general_ci'ENGINE=InnoDB;")
		//await native.sqlquery("CREATE TABLE`examplemapping`(	`test2` TINYTEXT NULL,`id` BIGINT(20) NOT NULL AUTO_INCREMENT,PRIMARY KEY(`id`))	COLLATE = 'latin1_swedish_ci'ENGINE = InnoDB		;		")

		await testFnc();
		console.log("done with " + testFnc.name)
	}
	await native.end()
	while (openPools.size > 0) {
		await new Promise(res => setTimeout(res, 10))
	}
})()