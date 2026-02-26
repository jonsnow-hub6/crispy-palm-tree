/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2484833797")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2484833797")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_vyorrLu87m` ON `actions` (\n  `payload`,\n  `project`\n)"
    ]
  }, collection)

  return app.save(collection)
})
