

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
import { MariaDbBase, openPools } from '../src/src/dbs/mariadb-base'
import { PsqlBase } from '../src/src/dbs/psql-base'
import { TestModel } from './testmodels/test-model'
import { save } from '../src/src/save'
import { ClWithMApping } from './testmodels/cl-with-mapping'
import type { DataBaseBase } from '../src/src/dbs/database-base'
import { DataCache } from '../src/src/memory-cache/data-cache'
import { load } from '../src/src/load'
config()

const native = new MariaDbBase(undefined, 20);
const infoSChemaBase = new MariaDbBase("information_schema");

let mariadDbTests = false;
(async () => {
	if (mariadDbTests) {
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
					native.sqlquery(null, "TRUNCATE TABLE `testmodel`;"),
					native.sqlquery(null, "TRUNCATE TABLE `clwithmapping`;"),
					native.sqlquery(null, "TRUNCATE TABLE `mappingcreate`;"),
					native.sqlquery(null, "TRUNCATE TABLE `recursivemapping`;"),
					native.sqlquery(null, "TRUNCATE TABLE `attributeitem`;")

				])
			} catch (e) {
				console.error(e);
				return;
			}
			console.log(testFnc.name)
			//	await native.sqlquery("CREATE TABLE `example` (`id` VARCHAR(50) NOT NULL COLLATE 'utf8_general_ci',	`col2` VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8_general_ci',	PRIMARY KEY (`id`) USING BTREE)COLLATE='utf8_general_ci'ENGINE=InnoDB;")
			//await native.sqlquery("CREATE TABLE`examplemapping`(	`test2` TINYTEXT NULL,`id` BIGINT(20) NOT NULL AUTO_INCREMENT,PRIMARY KEY(`id`))	COLLATE = 'latin1_swedish_ci'ENGINE = InnoDB		;		")

			await testFnc(native);
			console.log("done with " + testFnc.name)
		}
		await native.end()
		while (openPools.size > 0) {
			await new Promise(res => setTimeout(res, 10))
		}
	}
	const postgresBase = new PsqlBase({ database: "randomtest", keepAlive: true })


	/*const dataCache = new DataCache({
		modelDatabase: "randomtest",
		poolGenerator() {
			return postgresBase
		},
		table_prefix: "datacache"
	})*/


	await updateDatabase(`${__dirname}/testmodels`, {
		dbPoolGEnerator: PsqlBase,
		modelDb: "public"
	})

	await postgresBase.sqlquery(null, "TRUNCATE TABLE `testmodel`;");
	for (let testFnc of [testRecursiveMappings, testDuplicate, testlaodCalls, testloaddeep, testMAp, testsave, testmapping, ,
		testloadbyparam, testDbTransformer]) {
		try {
			await Promise.all([
				postgresBase.sqlquery(null, "TRUNCATE TABLE `testmodel`;"),
				postgresBase.sqlquery(null, "TRUNCATE TABLE `clwithmapping`;"),
				postgresBase.sqlquery(null, "TRUNCATE TABLE `mappingcreate`;"),
				postgresBase.sqlquery(null, "TRUNCATE TABLE `recursivemapping`;"),
				postgresBase.sqlquery(null, "TRUNCATE TABLE `attributeitem`;"),
				postgresBase.sqlquery(null, "TRUNCATE TABLE `testmodelnoprimary`;"),
				postgresBase.sqlquery(null, "TRUNCATE TABLE `testmodelnoprimaryandunique`;")

			])
		} catch (e) {
			console.error(e);
			return;
		}
		console.log(testFnc.name)
		//	await native.sqlquery("CREATE TABLE `example` (`id` VARCHAR(50) NOT NULL COLLATE 'utf8_general_ci',	`col2` VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8_general_ci',	PRIMARY KEY (`id`) USING BTREE)COLLATE='utf8_general_ci'ENGINE=InnoDB;")
		//await native.sqlquery("CREATE TABLE`examplemapping`(	`test2` TINYTEXT NULL,`id` BIGINT(20) NOT NULL AUTO_INCREMENT,PRIMARY KEY(`id`))	COLLATE = 'latin1_swedish_ci'ENGINE = InnoDB		;		")

		await testFnc(postgresBase);
		console.log("done with " + testFnc.name)
	}
	debugger
	for (let i = 1; i < 1000; i += 2) {

		const test = new ClWithMApping("idontcare" + i)
		const test2 = new ClWithMApping("idontcare" + i + 1)
		await save([test, test2], { db: postgresBase })



		const obj = new TestModel(i, "col")
		obj.timestamp = new Date()

		await save(obj, { db: postgresBase })


		const model = await load(TestModel, ((m) => m.id = obj.id) as ((m: TestModel) => any), undefined, {
			db: postgresBase as DataBaseBase
		})
		debugger
		//await save([test, test2], { db: native })


		const t = load(TestModel, {
			filter: `sdfsdf`,
			options: {
				first: true
			}
		})

	}
	debugger

})()