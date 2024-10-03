# hibernateTS

typescript clone for hiberante/persistance API

# Install

```
  npm i hibernatets
```

# Setup

currently support for mariadb databases

set up by setting these environment variables

```javascript
const db = process.env.DB_NAME;
const port = +process.env.DB_PORT;
const user = process.env.DB_USER;
const url = process.env.DB_URL;
const password = process.env.DB_PASSWORD;
```

for postgres

```javascript
const url =process.env.PSQL_URL
const port =process.env.PSQL_PORT
const password =process.env.PSQL_PWD
const user = process.env.PSQL_USER
const db =process.env.PSQL_DB

import {PsqlBase} from "hibernatets/dbs/psql-base"

const pool=new PsqlBase()
load(type,{
  ...
  options:{
    db:pool
  }
})

save(obj,{
  db:pool
})

```

experimentalDecorators needs to be enabled

# Api

### Models

configure database with annotations

```javascript
import { table, primary, column, mapping, Mappings } from 'hibernatets';
import { OtherModel } from './otherModel';

@table({
  // can be omitted defaults to ClassName toLowercase
  name: 'testmodel',
})
class TestModel {
  // { strategy: 'custom'|'auto-increment' }
  // custom for mapping to non auto-increment tables
  @primary()
  id: number;

  @column()
  randomcolumn: string;

  // key 'reverseforeignkey' in OtherModel references primary key of current table(TestModel)
  //alternative @mapping(Mappings.OneToMany,OtherModel,o=>o.reverseforeignkey) for autocompletion
  @mapping(Mappings.OneToMany, OtherModel, 'reverseforeignkey')
  othermodels: Array<OtherModel>;

  // key 'othermodel' in current table(TestModel) references primary key of OtherModel
  @mapping(Mappings.OneToOne, OtherModel)
  othermodel: OtherModel;
  //...
}
```

### Functions

##### Load

objects can be loaded with

```typescript
const obj: TestModel = await load(TestModel, 1); // primary key
```

or

```typescript
import { load } from 'hibernatets';

const obj: Array<TestModel> = await load(
  TestModel,
  (t) => (t.randomcolumn = 'test')
); //assignment here
const obj: TestModel = await load(
  TestModel,
  (t) => (t.randomcolumn = 'test'),
  [],
  { first: true }
); //assignment here
```

or

also see [SqlCondition](src/src/sql-condition.ts)

```typescript
const obj: Array<TestModel> = await load(
  TestModel,
  new SqlCondition().column('randomcolumn').equals('test')
);
const obj: TestModel = await load(
  TestModel,
  new SqlCondition().column('randomcolumn').equals('test'),
  [],
  { first: true }
);
```

or

```javascript
//!!!careful of sql injection with this approach @Deprecated in favor of SqlCondition
const obj: Array<TestModel> = await load(TestModel, 'randomcolumn = ?', [
  'test',
]);
//!!!careful of sql injection with this approach @Deprecated in favor of SqlCondition
const obj: TestModel = await load(TestModel, 'randomcolumn = ?', ['test'], {
  first: true,
});
```

for mappings the default is to not load nested mappings
this can be enabled by adding the optional "deep" parameter

```typescript
const obj: Array<TestModel> = await load(
  TestModel,
  (t) => (t.randomcolumn = 'test'),
  [],
  { deep: true }
);
const obj: TestModel = await load(
  TestModel,
  (t) => (t.randomcolumn = 'test'),
  [],
  { first: true, deep: true }
);

const obj: TestModel = await load(
  TestModel,
  (t) => (t.randomcolumn = 'test'),
  [],
  { first: true, deep: ['othermodels'] }
); //only loads othermodels mappings
const obj: TestModel = await load(
  TestModel,
  (t) => (t.randomcolumn = 'test'),
  [],
  {
    first: true,
    deep: {
      othermodels: " othermodelatt = 'test'  ",
    },
  }
); //only loads othermodels with query !!!careful of sql injection
```

alternatively all options can be passed in this format

```typescript
const obj: Array<TestModel> = await load(TestModel, {
  filter: 'randomcolumn = ?', //for loading all just leave away
  params: ['test'],
  options: {
    deep: true,
  },
});
```

##### Updates

see [Timing](#timing) if you want to await finishing of request
if and object is loaded with

<p>interceptArrayFunctions: true<p>

- Array.push will automatically store pushed Elements
- Array.filter will remove filtered out Elements !!

(setters are always intercepted unless dontInterceptSetters:true is passed to load)

```typescript
// with @column() attribute
const obj: TestModel = await load(TestModel, 1, [], {
  interceptArrayFunctions: true,
});

// automatically gets persisted to database
obj.attribute = 'test';

// with @mapping(Mappings.OneToMany) attributes
const obj: TestModel = await load(TestModel, 1);

const newObject = new NewObject();
// automatically gets added and persisted
obj.attributes.push(newObject);
```

##### Timing

assignments to loaded objects get automatically persisted and can be awaited with

```javascript
const obj = await load(TestModel, 0);
obj.attribute = 'test';
//sql request not finished yet
await database.queries(obj);
//sql requests all finished
```

##### Delete

```javascript
//alternative delete(Class,primary)
database.delete(obj);
```

##### Save

```javascript
// for new Objects - loaded objects autoupdate on attribute change
database.save(obj);
```

# Database Updates

when @column() annotation is used to further specify database fields
updateDatabase can be used to automatically update the database for certain changes

- database types: 'text' 'number'
- database sizes: 'small' 'medium' 'large'
- nullable
- default

```javascript
import { updateDatabase,table,column } from "hibernatets"

@table()
export class TestModel {

    // creates database column with type BIGINT
    @column({
      type:"number"
      size:"large"
    })
    example

}
```

```javascript
// creates missing tables
// adds missing columns
// increases column size
// takes argument for folder with model files
updateDatabase(`${__dirname}/testmodels`);
```

# Transformations

if a certain runtime type is too unique for this library
you can specify transformations that are applied before saving or loading

```javascript
import { updateDatabase,table,column } from "hibernatets"

@table()
export class TestModel {

    // creates database column with type BIGINT
    @column({
      type:"number"
      size:"large",
      transformations:{
        loadFromDbToProperty: (dbData: U) => Promise<T>;
	      saveFromPropertyToDb: (obj: T) => Promise<U>
      }
    })
    example

}
```

# custom constraints

custom constraints can be added on a per table basic liek this

```javascript
@table({
    constraints: [{
        type: "unique",
        columns: ["test1", "test2"]
    }]
})

```

npm at
https://www.npmjs.com/package/hibernatets
