/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('settings');

    const presetPassword = new Record(settings);
    presetPassword.set('key', 'preset_password');
    presetPassword.set('value', 'Preset1!');
    app.save(presetPassword);
  },
  (app) => {
    app.delete(
      app.findRecordsByFilter('settings', 'key="preset_password"')[0]
    );
  },
);
