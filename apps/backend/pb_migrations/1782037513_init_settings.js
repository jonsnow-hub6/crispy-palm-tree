/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('settings');

    const notificationsRetention = new Record(settings);
    notificationsRetention.set('key', 'notifications_retention_minutes');
    notificationsRetention.set('value', '60');
    app.save(notificationsRetention);

    const alertsRetention = new Record(settings);
    alertsRetention.set('key', 'alerts_retention_minutes');
    alertsRetention.set('value', '5');
    app.save(alertsRetention);

    const raphaRetention = new Record(settings);
    raphaRetention.set('key', 'rapha_retention_minutes');
    raphaRetention.set('value', '1');
    app.save(raphaRetention);

    const leoRetention = new Record(settings);
    leoRetention.set('key', 'leo_retention_minutes');
    leoRetention.set('value', '5');
    app.save(leoRetention);
  },
  (app) => {
    app.delete(
      app.findRecordsByFilter(
        'settings',
        'key="notifications_retention_minutes"',
      )[0],
    );
    app.delete(
      app.findRecordsByFilter('settings', 'key="alerts_retention_minutes"')[0],
    );
    app.delete(
      app.findRecordsByFilter('settings', 'key="rapha_retention_minutes"')[0],
    );
    app.delete(
      app.findRecordsByFilter('settings', 'key="leo_retention_minutes"')[0],
    );
  },
);
