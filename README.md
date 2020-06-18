# hibernateTS
typescript clone for hiberante/persistance API

# install

```
  npm i hibernatets
```

#apis

currently only support for mariadb databases 

set up by setting these environment variables
```javascript
const db = process.env.DB_NAME;
const port = +process.env.DB_PORT;
const user = process.env.DB_USER;
const url = process.env.DB_URL;
const password = process.env.DB_PASSWORD;
```

experimentalDecorators needs to be enabled


configure database with annotations
```javascript
import {database} from "hibernatets"
import { table,primary,column ,mapping } from "hibernatets"

@table("test")
class TestModel{

  @primary()
  id:number
  
  @column()
  randomcolumn:string
  
  //alternative @mapping(Mappings.OneToMany,OtherModel,o=>o.reverseforeignkey) for autocompletion
  @mapping(Mappings.OneToMany,OtherModel,"reverseforeignkey")
  othermodels:Array<OtherModel>
  
  //...
}
```

objects can then be loaded with 

```javascript
const obj=database.load(TestModel,t=>t.randomcolumn="test"); //assignment here
```

or 
```javascript
const obj:Array<TestModel>=database.load(TestModel,"`randomcolumn = ?`",\["test"]);
```
or
```javascript
const obj:TestModel=await database.load(TestModel,1) // primary key
```


assignments to loaded objects get automatically persisted and can be awaited with 
```javascript
await database.queries(obj)
```
save and delete can also be done
```javascript
database.delete()
database.save()
```

npm at 
https://www.npmjs.com/package/hibernatets

