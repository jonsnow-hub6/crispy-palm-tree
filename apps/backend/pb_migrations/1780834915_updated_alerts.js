/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3228155173")

  // remove field
  collection.fields.removeById("select2363381545")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3228155173")

  // add field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select2363381545",
    "maxSelect": 1,
    "name": "type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "magic",
      "counter",
      "preset"
    ]
  }))

  return app.save(collection)
})
