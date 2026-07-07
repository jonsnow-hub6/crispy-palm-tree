/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3465327118")

  // update collection data
  unmarshal({
    "createRule": "@collection.decoders.decoderId ?= decoderId"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3465327118")

  // update collection data
  unmarshal({
    "createRule": ""
  }, collection)

  return app.save(collection)
})
