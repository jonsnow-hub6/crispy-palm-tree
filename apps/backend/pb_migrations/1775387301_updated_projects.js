/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_484305853")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_CfWgL8YDId` ON `projects` (`name`)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("text3475444733")

  // remove field
  collection.fields.removeById("number1133600204")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_484305853")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_CfWgL8YDId` ON `projects` (`name`)",
      "CREATE UNIQUE INDEX `idx_vwgT0wjWiN` ON `projects` (\n  `port`,\n  `host`\n)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3475444733",
    "max": 0,
    "min": 0,
    "name": "host",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number1133600204",
    "max": 65535,
    "min": 0,
    "name": "port",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
