/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "select3762918058",
    "maxSelect": 4,
    "name": "permission",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "dashboard",
      "stations",
      "presets",
      "decoder"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "select3762918058",
    "maxSelect": 0,
    "name": "permission",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "dashboard",
      "stations",
      "presets",
      "decoder"
    ]
  }))

  return app.save(collection)
})
