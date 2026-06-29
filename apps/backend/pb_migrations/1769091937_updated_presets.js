/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1118224005');

    // update field
    collection.fields.addAt(
      3,
      new Field({
        cascadeDelete: false,
        collectionId: 'pbc_2484833797',
        hidden: false,
        id: 'relation88666607',
        maxSelect: 999,
        minSelect: 0,
        name: 'actions',
        presentable: false,
        required: true,
        system: false,
        type: 'relation',
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1118224005');

    // update field
    collection.fields.addAt(
      3,
      new Field({
        cascadeDelete: false,
        collectionId: 'pbc_2484833797',
        hidden: false,
        id: 'relation88666607',
        maxSelect: 999,
        minSelect: 0,
        name: 'actions',
        presentable: false,
        required: false,
        system: false,
        type: 'relation',
      }),
    );

    return app.save(collection);
  },
);
