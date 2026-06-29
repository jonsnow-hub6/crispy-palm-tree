/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_');

    // update collection data
    unmarshal(
      {
        createRule: '',
        deleteRule: '',
        indexes: [
          'CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)',
          "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''",
          'CREATE UNIQUE INDEX `idx_wszazw9elo` ON `users` (`username`)',
        ],
        listRule: '',
        passwordAuth: {
          identityFields: ['username'],
        },
        updateRule: '',
        viewRule: '',
      },
      collection,
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_');

    // update collection data
    unmarshal(
      {
        createRule: null,
        deleteRule: null,
        indexes: [
          'CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)',
          "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''",
          'CREATE INDEX `idx_wszazw9elo` ON `users` (`username`)',
        ],
        listRule: null,
        passwordAuth: {
          identityFields: ['email'],
        },
        updateRule: null,
        viewRule: null,
      },
      collection,
    );

    return app.save(collection);
  },
);
