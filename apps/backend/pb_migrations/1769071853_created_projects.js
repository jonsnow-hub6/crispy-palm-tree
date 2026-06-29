/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      createRule: null,
      deleteRule: null,
      fields: [
        {
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
        },
        {
          autogeneratePattern: '',
          hidden: false,
          id: 'text3208210256',
          max: 0,
          min: 0,
          name: 'id',
          pattern: '^[a-z0-9]+$',
          presentable: false,
          primaryKey: true,
          required: true,
          system: true,
          type: 'text',
        },
        {
          autogeneratePattern: '',
          hidden: false,
          id: 'text3475444733',
          max: 0,
          min: 0,
          name: 'host',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: true,
          system: false,
          type: 'text',
        },
        {
          hidden: false,
          id: 'number1133600204',
          max: 65535,
          min: 0,
          name: 'port',
          onlyInt: true,
          presentable: false,
          required: true,
          system: false,
          type: 'number',
        },
        {
          hidden: false,
          id: 'autodate2990389176',
          name: 'created',
          onCreate: true,
          onUpdate: false,
          presentable: false,
          system: false,
          type: 'autodate',
        },
        {
          hidden: false,
          id: 'autodate3332085495',
          name: 'updated',
          onCreate: true,
          onUpdate: true,
          presentable: false,
          system: false,
          type: 'autodate',
        },
      ],
      id: 'pbc_484305853',
      indexes: [
        'CREATE UNIQUE INDEX `idx_CfWgL8YDId` ON `projects` (`name`)',
        'CREATE UNIQUE INDEX `idx_vwgT0wjWiN` ON `projects` (\n  `port`,\n  `host`\n)',
      ],
      listRule: null,
      name: 'projects',
      system: false,
      type: 'base',
      updateRule: null,
      viewRule: null,
    });

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_484305853');

    return app.delete(collection);
  },
);
