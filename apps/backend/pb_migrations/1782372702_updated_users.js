/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_');

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

    // add field
    collection.fields.addAt(
      8,
      new Field({
        help: '',
        hidden: false,
        id: 'select3762918058',
        maxSelect: 0,
        name: 'permission',
        presentable: false,
        required: false,
        system: false,
        type: 'select',
        values: ['dashboard', 'stations', 'presets', 'decoder'],
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_');

    // update collection data
    unmarshal(
      {
        createRule: '',
        deleteRule: 'id = @request.auth.id',
        listRule: 'id = @request.auth.id',
        updateRule: 'id = @request.auth.id',
        viewRule: 'id = @request.auth.id',
      },
      collection,
    );

    // remove field
    collection.fields.removeById('select3762918058');

    return app.save(collection);
  },
);
