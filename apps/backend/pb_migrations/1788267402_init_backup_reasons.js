/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const backupReasons = app.findCollectionByNameOrId('backupReasons');

    const backupReasonsData = [
      {
        message: 'High Carrier Phase detected',
        query:
          "SELECT 1 FROM rapha WHERE created >= {:time} AND CAST(json_extract(parameters, '$.carrierPhase') AS REAL) > 100 LIMIT 1;",
        enabled: true,
      },
      {
        message: 'PLL Lock Loss detected',
        query:
          "SELECT 1 FROM rapha WHERE created >= {:time} AND CAST(json_extract(parameters, '$.pllLockState') AS INTEGER) = 0 LIMIT 1;",
        enabled: true,
      },
      {
        message: 'Low SNR detected',
        query:
          "SELECT 1 FROM rapha WHERE created >= {:time} AND CAST(json_extract(parameters, '$.snr') AS REAL) < 100 LIMIT 1;",
        enabled: true,
      },
      {
        message: 'Incorrect Magic detected',
        query:
          "SELECT 1 FROM leo WHERE created >= {:time} AND CAST(magic AS TEXT) != '12345678' LIMIT 1;",
        enabled: true,
      },
      {
        message: 'No DB telemetries detected',
        query:
          'SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM rapha WHERE created >= {:time}) LIMIT 1;',
        enabled: false,
      },
      {
        message: 'No MB telemetries detected',
        query:
          'SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM leo WHERE created >= {:time}) LIMIT 1;',
        enabled: false,
      },
    ];

    backupReasonsData.forEach((data) => {
      const record = new Record(backupReasons);

      record.set('message', data.message);
      record.set('query', data.query);
      record.set('enabled', data.enabled);

      app.save(record);
    });
  },

  (app) => {
    const messages = [
      'High Carrier Phase detected',
      'PLL Lock Loss detected',
      'Low SNR detected',
      'Incorrect Magic detected',
      'No DB telemetries detected',
      'No MB telemetries detected',
    ];

    messages.forEach((message) => {
      const record = app.findRecordsByFilter(
        'backupReasons',
        `message = '${message.replace(/'/g, "''")}'`,
      )[0];

      app.delete(record);
    });
  },
);