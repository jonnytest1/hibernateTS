import { table, load, mapping, Mappings, intercept, primary, column, save } from "hibernatets"
import { DataBaseBase } from "hibernatets/mariadb-base"

import { config } from "dotenv"
import { testDuplicate } from './test/duplicateupdate'
import { testloadbyparam } from './test/testloadbyparam'
import { testmapping } from './test/testmapping'

config()

const native = new DataBaseBase();


(async () => {

	for (let testFnc of [testDuplicate, testloadbyparam, testmapping]) {
		try {
			await native.sqlquery("DROP TABLE `example`;")
		} catch (e) {

		}
		await native.sqlquery("CREATE TABLE `example` (`id` VARCHAR(50) NOT NULL COLLATE 'utf8_general_ci',	`col2` VARCHAR(50) NULL DEFAULT NULL COLLATE 'utf8_general_ci',	PRIMARY KEY (`id`) USING BTREE)COLLATE='utf8_general_ci'ENGINE=InnoDB;")
		await testFnc();
	}
})()