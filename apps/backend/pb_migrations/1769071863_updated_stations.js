/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_3887672816');

    // update collection data
    unmarshal(
      {
        indexes: [
          'CREATE UNIQUE INDEX `idx_WyOBjQ7EdT` ON `stations` (`name`)',
        ],
      },
      collection,
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_3887672816');

    // update collection data
    unmarshal(
      {
        indexes: ['CREATE INDEX `idx_WyOBjQ7EdT` ON `stations` (`name`)'],
      },
      collection,
    );

    return app.save(collection);
  },
);
