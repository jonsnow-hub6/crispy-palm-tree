/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2138525773")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "bool2768564032",
    "name": "isCounterCorrect",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2138525773")

  // remove field
  collection.fields.removeById("bool2768564032")

  return app.save(collection)
})
