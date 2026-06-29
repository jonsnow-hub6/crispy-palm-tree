/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2484833797');

    // update collection data
    unmarshal(
      {
        indexes: [
          'CREATE UNIQUE INDEX `idx_vyorrLu87m` ON `actions` (\n  `payload`,\n  `project`\n)',
        ],
      },
      collection,
    );

    // remove field
    collection.fields.removeById('text1579384326');

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2484833797');

    // update collection data
    unmarshal(
      {
        indexes: [],
      },
      collection,
    );

    // add field
    collection.fields.addAt(
      1,
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text1579384326',
        max: 0,
        min: 0,
        name: 'name',
        pattern: '',
        presentable: true,
        primaryKey: false,
        required: true,
        system: false,
        type: 'text',
      }),
    );

    return app.save(collection);
  },
);
