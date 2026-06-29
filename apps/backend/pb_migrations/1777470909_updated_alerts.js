/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_3228155173');

    // update collection data
    unmarshal(
      {
        createRule: '',
        deleteRule: '',
        listRule: '',
        updateRule: '',
        viewRule: '',
      },
      collection,
    );

    // add field
    collection.fields.addAt(
      1,
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text3065852031',
        max: 0,
        min: 0,
        name: 'message',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    );

    // add field
    collection.fields.addAt(
      2,
      new Field({
        hidden: false,
        id: 'select2599078931',
        maxSelect: 1,
        name: 'level',
        presentable: false,
        required: false,
        system: false,
        type: 'select',
        values: ['info', 'warning', 'error', 'critical'],
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_3228155173');

    // update collection data
    unmarshal(
      {
        createRule: null,
        deleteRule: null,
        listRule: null,
        updateRule: null,
        viewRule: null,
      },
      collection,
    );

    // remove field
    collection.fields.removeById('text3065852031');

    // remove field
    collection.fields.removeById('select2599078931');

    return app.save(collection);
  },
);
