/// <reference path="../pb_data/types.d.ts" />

cronAdd('create_backup', '*/1 * * * *', () => {
  try {
    const since = new Date(Date.now() - 60_000)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');

    const rules = $app.findRecordsByFilter('backupReasons', 'enabled = true');

    if (rules.length === 0) {
      return;
    }

    const alertsCollection = $app.findCollectionByNameOrId('alerts');

    let shouldCreateBackup = false;

    for (const rule of rules) {
      try {
        const rows = $app
          .db()
          .newQuery(rule.get('query'))
          .bind({
            time: since,
          })
          .rows();

        const triggered = rows.next();
        rows.close();

        if (!triggered) {
          continue;
        }

        shouldCreateBackup = true;

        const alert = new Record(alertsCollection);
        alert.set('level', 'critical');
        alert.set('message', rule.get('message'));

        $app.save(alert);

        console.log(`Backup rule triggered: ${rule.get('message')}`);
      } catch (err) {
        console.error(
          `Failed to execute backup rule '${rule.get('message')}'`,
          err,
        );
      }
    }

    if (!shouldCreateBackup) {
      return;
    }

    const backupName = `${new Date().toISOString().replace(/:/g, '-')}.zip`;
    $app.createBackup(new Context(), backupName);
  } catch (err) {
    console.error('create_backup cron failed', err);
  }
});
