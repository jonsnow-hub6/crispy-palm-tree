/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2138525773")

  // add presetId
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_presetId",
    "max": 0,
    "min": 0,
    "name": "presetId",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add presetIndex
  collection.fields.addAt(12, new Field({
    "hidden": false,
    "id": "num_presetIndex",
    "max": null,
    "min": null,
    "name": "presetIndex",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add presetStatus
  collection.fields.addAt(13, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_presetStatus",
    "max": 0,
    "min": 0,
    "name": "presetStatus",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2138525773")

  collection.fields.removeById("text_presetId")
  collection.fields.removeById("num_presetIndex")
  collection.fields.removeById("text_presetStatus")

  return app.save(collection)
})
