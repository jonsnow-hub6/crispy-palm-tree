/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2367680895")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_cbao9rt5ct` ON `backupReasons` (`backupReason`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2367680895")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
