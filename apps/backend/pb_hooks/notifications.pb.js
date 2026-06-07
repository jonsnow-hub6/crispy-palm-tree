/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess(async (e) => {
  const MAX = 10000;
  const DELETE_BATCH = 1000;

  if (process.env.LOGSTASH_URL) {
    $http.send({
      url: process.env.LOGSTASH_URL,
      method: 'POST',
      body: JSON.stringify({
        level: e.record.get('level'),
        type: e.record.get('type'),
        message: e.record.get('content'),
        metadata: e.record.get('metadata'),
        timestamp: e.record.get('created'),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await $app.runInTransaction((txApp) => {
    const total = txApp.findAllRecords('notifications').length;

    if (total <= MAX) return;

    const oldest = txApp.findRecordsByFilter(
      'notifications',
      '',
      'created', // oldest first
      DELETE_BATCH,
      0,
    );

    for (const r of oldest) {
      txApp.delete(r);
    }
  });

  e.next();
}, 'notifications');

onRecordAfterCreateSuccess(async (e) => {
  const MAX = 1000;
  const DELETE_BATCH = 100;

  await $app.runInTransaction((txApp) => {
    const total = txApp.findAllRecords('rapha').length;

    if (total <= MAX) return;

    const oldest = txApp.findRecordsByFilter(
      'rapha',
      '',
      'created', // oldest first
      DELETE_BATCH,
      0,
    );

    for (const r of oldest) {
      txApp.delete(r);
    }
  });

  e.next();
}, 'rapha');

onRecordAfterCreateSuccess(async (e) => {
  const MAX = 1000;
  const DELETE_BATCH = 100;

  await $app.runInTransaction((txApp) => {
    const total = txApp.findAllRecords('leo').length;

    if (total <= MAX) return;

    const oldest = txApp.findRecordsByFilter(
      'leo',
      '',
      'created', // oldest first
      DELETE_BATCH,
      0,
    );

    for (const r of oldest) {
      txApp.delete(r);
    }
  });

  e.next();
}, 'leo');
