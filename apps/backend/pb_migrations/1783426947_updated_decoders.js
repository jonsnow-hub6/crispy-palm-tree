/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_320636278")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_ge1rd6xi9z` ON `decoders` (`decoderId`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_320636278")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
