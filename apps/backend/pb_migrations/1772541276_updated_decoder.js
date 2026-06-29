/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2138525773")

  // update collection data
  unmarshal({
    "name": "leo"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2138525773")

  // update collection data
  unmarshal({
    "name": "decoder"
  }, collection)

  return app.save(collection)
})
