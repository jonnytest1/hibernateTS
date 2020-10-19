import { table, load, mapping, Mappings, intercept, primary, column, save } from "hibernatets"
import { DataBaseBase } from "hibernatets/mariadb-base"

import { config } from "dotenv"
import { testDuplicate } from './test/duplicateupdate'
import { testloadbyparam } from './test/testloadbyparam'
import { testmapping } from './test/testmapping'
import { updateDatabase } from "../src/src/db";
config()

const native = new DataBaseBase();

(async () => {

	//await native.sqlquery("DROP TABLE `example`;")
	//await native.sqlquery("DROP TABLE `examplemapping`;")

	updateDatabase(`${__dirname}/testmodels`)

	/*for (let testFnc of [testDuplicate, testloadbyparam, testmapping]) {
		try {
			await native.sqlquery("DROP TABLE `example`;")
			await native.sqlquery("DROP TABLE `examplemapping`;")
		} catch (e) {

		}
		await native.sqlquery("CREATE TABLE `example` (`id` VARCHAR(50) NOT NULL COLLATE 'utf8_general_ci',	`col2` VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8_general_ci',	PRIMARY KEY (`id`) USING BTREE)COLLATE='utf8_general_ci'ENGINE=InnoDB;")
		await native.sqlquery("CREATE TABLE`examplemapping`(	`test2` TINYTEXT NULL,`id` BIGINT(20) NOT NULL AUTO_INCREMENT,PRIMARY KEY(`id`))	COLLATE = 'latin1_swedish_ci'ENGINE = InnoDB		;		")
		await testFnc();
	}*/
})()