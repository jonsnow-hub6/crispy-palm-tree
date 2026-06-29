/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1118224005');

    // add field
    collection.fields.addAt(
      5,
      new Field({
        help: '',
        hidden: false,
        id: 'bool1160410925',
        name: 'passwordRequired',
        presentable: false,
        required: true,
        system: false,
        type: 'bool',
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1118224005');

    // remove field
    collection.fields.removeById('bool1160410925');

    return app.save(collection);
  },
);
