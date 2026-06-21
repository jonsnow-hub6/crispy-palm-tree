/// <reference path="../pb_data/types.d.ts" />

cronAdd('delete_old_notifications', '*/1 * * * *', () => {
  const notificationsRetentionSettings = $app.findRecordsByFilter(
    'settings',
    "key = 'notifications_retention_minutes'",
    '',
    1,
    0,
  );

  let notificationsRetention = 60;
  if (
    notificationsRetentionSettings &&
    notificationsRetentionSettings.length > 0
  ) {
    notificationsRetention = Number(
      notificationsRetentionSettings[0].get('value') || 60,
    );
    if (isNaN(notificationsRetention)) notificationsRetention = 60;
  }

  $app
    .db()
    .newQuery(
      `
      DELETE FROM notifications
      WHERE created < datetime('now', '-${notificationsRetention} minute')
      AND created < (
        SELECT created
        FROM notifications
        ORDER BY created DESC
        LIMIT 1 OFFSET 99
      );
    `,
    )
    .execute();
});

cronAdd('delete_old_alerts', '*/1 * * * *', () => {
  const alertsRetentionSettings = $app.findRecordsByFilter(
    'settings',
    "key = 'alerts_retention_minutes'",
    '',
    1,
    0,
  );

  let alertsRetention = 5;
  if (alertsRetentionSettings && alertsRetentionSettings.length > 0) {
    alertsRetention = Number(alertsRetentionSettings[0].get('value') || 5);
    if (isNaN(alertsRetention)) alertsRetention = 5;
  }

  $app
    .db()
    .newQuery(
      `
      DELETE FROM alerts
      WHERE created < datetime('now', '-${alertsRetention} minute');
    `,
    )
    .execute();
});

cronAdd('delete_old_rapha', '*/1 * * * *', () => {
  const raphaRetentionSettings = $app.findRecordsByFilter(
    'settings',
    "key = 'rapha_retention_minutes'",
    '',
    1,
    0,
  );

  let raphaRetention = 1;
  if (raphaRetentionSettings && raphaRetentionSettings.length > 0) {
    raphaRetention = Number(raphaRetentionSettings[0].get('value') || 1);
    if (isNaN(raphaRetention)) raphaRetention = 1;
  }

  $app
    .db()
    .newQuery(
      `
      DELETE FROM rapha
      WHERE created < datetime('now', '-${raphaRetention} minute');
    `,
    )
    .execute();
});

cronAdd('delete_old_leo', '*/1 * * * *', () => {
  const leoRetentionSettings = $app.findRecordsByFilter(
    'settings',
    "key = 'leo_retention_minutes'",
    '',
    1,
    0,
  );

  let leoRetention = 5;
  if (leoRetentionSettings && leoRetentionSettings.length > 0) {
    leoRetention = Number(leoRetentionSettings[0].get('value') || 5);
    if (isNaN(leoRetention)) leoRetention = 5;
  }

  $app
    .db()
    .newQuery(
      `
      DELETE FROM leo
      WHERE created < datetime('now', '-${leoRetention} minute');
    `,
    )
    .execute();
});
