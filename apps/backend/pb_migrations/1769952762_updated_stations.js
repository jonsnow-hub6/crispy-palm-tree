/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_3887672816');

    // update collection data
    unmarshal(
      {
        deleteRule: null,
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
        deleteRule: '',
      },
      collection,
    );

    return app.save(collection);
  },
);
