/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2138525773');

    // add field
    collection.fields.addAt(
      7,
      new Field({
        hidden: false,
        id: 'number1219652353',
        max: null,
        min: null,
        name: 'messageType',
        onlyInt: false,
        presentable: false,
        required: false,
        system: false,
        type: 'number',
      }),
    );

    // add field
    collection.fields.addAt(
      8,
      new Field({
        hidden: false,
        id: 'number189699407',
        max: null,
        min: null,
        name: 'management',
        onlyInt: false,
        presentable: false,
        required: false,
        system: false,
        type: 'number',
      }),
    );

    // add field
    collection.fields.addAt(
      9,
      new Field({
        hidden: false,
        id: 'number3950652054',
        max: null,
        min: null,
        name: 'threshold',
        onlyInt: false,
        presentable: false,
        required: false,
        system: false,
        type: 'number',
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2138525773');

    // remove field
    collection.fields.removeById('number1219652353');

    // remove field
    collection.fields.removeById('number189699407');

    // remove field
    collection.fields.removeById('number3950652054');

    return app.save(collection);
  },
);
