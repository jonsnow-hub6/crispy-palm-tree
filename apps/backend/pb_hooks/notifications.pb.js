/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess(async (e) => {
  if (process.env.LOGSTASH_URL && process.env.LOGSTASH_METHOD) {
    $http.send({
      url: process.env.LOGSTASH_URL,
      method: process.env.LOGSTASH_METHOD,
      body: JSON.stringify({
        level: e.record.get('level'),
        type: e.record.get('type'),
        message: e.record.get('content'),
        source: 'home',
        metadata: e.record.get('metadata'),
        timestamp: e.record.get('created'),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  e.next();
}, 'notifications');
