/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  const record = e.record;
  const currentProjectId = record.get('projectId') || '';

  // Helper to construct exact DB query for pair history
  const getHistoryQuery = (pairKey) => {
    if (pairKey === 'magic') return `type = 'magic'`;
    if (pairKey === 'counter') return `type = 'counter'`;
    if (pairKey === 'unexpected_log')
      return `type = 'preset' && (message ~ 'Unexpected log' || message ~ 'matches preset' || message ~ 'matches active preset')`;
    if (pairKey === 'missing_presets')
      return `type = 'preset' && (message ~ 'presets are in the logs' || message ~ 'actions from active preset')`;
    return '';
  };

  const PAIRS = {
    magic: {
      isBad: (m) => String(m || '').includes('Magic mismatch'),
    },
    counter: {
      isBad: (m) => String(m || '').includes('not increasing'),
    },
    unexpected_log: {
      isBad: (m) => String(m || '').includes('Unexpected log'),
    },
    missing_presets: {
      isBad: (m) =>
        String(m || '').includes('Not all presets are in the logs') ||
        String(m || '').includes('Not all actions from active preset'),
    },
  };

  // Helper to dispatch alert safely and deduplicate by state
  const dispatchAlert = (
    type,
    level,
    message,
    pairKey,
    pairArgs,
    isBadState,
  ) => {
    try {
      if (pairKey && PAIRS[pairKey]) {
        const pair = PAIRS[pairKey];
        const filterStr = getHistoryQuery(pairKey);
        let goSlice = [];
        if (filterStr) {
          goSlice = $app.findRecordsByFilter(
            'alerts',
            filterStr,
            '-created',
            1,
            0,
          );
        }

        if (goSlice && goSlice.length > 0) {
          const lastMessage = goSlice[0].get('message');
          const wasBad = pair.isBad(lastMessage);
          // Ignore identical state transitions
          if (isBadState && wasBad) return;
          if (!isBadState && !wasBad) return;
        } else {
          // Start silently for Good state if no history exists
          if (!isBadState) return;
        }
      }

      const collection = $app.findCollectionByNameOrId('alerts');
      const alert = new Record(collection);
      alert.set('type', type);
      alert.set('level', level);
      alert.set('message', message);
      $app.save(alert);
    } catch (err) {
      console.error('Failed to save alert:', err.message || err);
    }
  };

  // Helper to stringify record for logs
  const logData = {
    id: record.get('id'),
    created: record.get('created'),
    updated: record.get('updated'),
    counter: record.get('counter'),
    magic: record.get('magic'),
    reserved: record.get('reserved'),
    timeOfArrival: record.get('timeOfArrival'),
    decoderId: record.get('decoderId'),
    projectId: record.get('projectId'),
    messageType: record.get('messageType'),
    management: record.get('management'),
    threshold: record.get('threshold'),
    payload: record.get('payload'),
  };
  const recordPayloadStr = JSON.stringify(logData);

  // ----------------------------------------------------
  // 1. Magic Mismatch
  // ----------------------------------------------------
  try {
    const settings = $app.findRecordsByFilter(
      'settings',
      "key = 'magic'",
      '',
      1,
      0,
    );
    if (settings && settings.length > 0) {
      const expectedStr = String(settings[0].get('value') || '').trim();
      const magicStr = String(record.get('magic') || '').trim();
      if (expectedStr !== '') {
        if (magicStr !== expectedStr) {
          dispatchAlert(
            'magic',
            'error',
            `Magic mismatch for project ${currentProjectId}. Log: ${recordPayloadStr}`,
            'magic',
            null,
            true,
          );
        } else {
          dispatchAlert(
            'magic',
            'info',
            `Magic matched for project ${currentProjectId}. Log: ${recordPayloadStr}`,
            'magic',
            null,
            false,
          );
        }
      }
    }
  } catch (err) {
    $app.logger().error('alerts.pb.js Magic Check failed', err.message || err);
  }

  // ----------------------------------------------------
  // 2. Counter not increasing
  // ----------------------------------------------------
  try {
    const prevLogs = $app.findRecordsByFilter(
      'leo',
      `projectId = '${currentProjectId}' && id != '${record.get('id')}'`,
      '-created',
      1,
      0,
    );
    if (prevLogs && prevLogs.length > 0) {
      const prevCounter = Number(prevLogs[0].get('counter') || 0);
      const currentCounter = Number(record.get('counter') || 0);
      if (currentCounter <= prevCounter) {
        if (!(currentCounter < 10 && prevCounter > 200)) {
          // normal failure
          dispatchAlert(
            'counter',
            'error',
            `Counter not increasing for project ${currentProjectId}. Log: ${recordPayloadStr}`,
            'counter',
            null,
            true,
          );
        } else {
          // safe wrapper
          dispatchAlert(
            'counter',
            'info',
            `Counter increasing for project ${currentProjectId}. Log: ${recordPayloadStr}`,
            'counter',
            null,
            false,
          );
        }
      } else {
        dispatchAlert(
          'counter',
          'info',
          `Counter increasing for project ${currentProjectId}. Log: ${recordPayloadStr}`,
          'counter',
          null,
          false,
        );
      }
    }
  } catch (err) {
    $app
      .logger()
      .error('alerts.pb.js Counter Check failed', err.message || err);
  }

  // ----------------------------------------------------
  // 3. Log not in preset & 4. Missing preset in logs
  // ----------------------------------------------------
  try {
    const activePresets = $app.findRecordsByFilter(
      'presets',
      'active = true',
      '',
      1,
      0,
    );
    if (activePresets && activePresets.length > 0) {
      const activePreset = activePresets[0];
      $app.expandRecord(activePreset, ['actions'], null);
      const actions = activePreset.expandedAll('actions');

      if (actions && actions.length > 0) {
        let isPresetLog = false;
        for (let i = 0; i < actions.length; i++) {
          const a = actions[i];
          if (
            String(a.get('project')).trim() ===
              String(currentProjectId).trim() &&
            String(a.get('payload')).trim() ===
              String(record.get('payload')).trim()
          ) {
            isPresetLog = true;
            break;
          }
        }

        if (!isPresetLog) {
          dispatchAlert(
            'preset',
            'error',
            `Unexpected log for project ${currentProjectId}: payload ${record.get('payload')} is not in active preset "${activePreset.get('name')}". Log: ${recordPayloadStr}`,
            'unexpected_log',
            null,
            true,
          );
        } else {
          dispatchAlert(
            'preset',
            'info',
            `Log payload ${record.get('payload')} matches active preset "${activePreset.get('name')}" for project ${currentProjectId}.`,
            'unexpected_log',
            null,
            false,
          );
        }

        const recentLeo = $app.findRecordsByFilter(
          'leo',
          '',
          '-created',
          150,
          0,
        );
        let missingActions = [];
        let matchedCount = 0;
        for (let i = 0; i < actions.length; i++) {
          const a = actions[i];
          let found = false;
          for (let j = 0; j < recentLeo.length; j++) {
            if (
              String(a.get('project')).trim() ===
                String(recentLeo[j].get('projectId')).trim() &&
              String(a.get('payload')).trim() ===
                String(recentLeo[j].get('payload')).trim()
            ) {
              found = true;
              break;
            }
          }
          if (found) {
            matchedCount++;
          } else {
            missingActions.push(
              `{ project: ${a.get('project')}, payload: ${a.get('payload')} }`,
            );
          }
        }

        if (missingActions.length > 0) {
          dispatchAlert(
            'preset',
            'warning',
            `Not all actions from active preset "${activePreset.get('name')}" are in the logs. Missing: ${missingActions.join(', ')}`,
            'missing_presets',
            {},
            true,
          );
        } else {
          dispatchAlert(
            'preset',
            'info',
            `All actions from active preset "${activePreset.get('name')}" are currently in the logs.`,
            'missing_presets',
            {},
            false,
          );
        }
      }
    }
  } catch (err) {
    $app.logger().error('alerts.pb.js Preset Check failed', err.message || err);
  }

  e.next();
}, 'leo');

onRecordAfterCreateSuccess((e) => {
  const MAX = 10000;
  const DELETE_BATCH = 1000;

  try {
    if (process.env.LOGSTASH_URL) {
      $http.send({
        url: process.env.LOGSTASH_URL,
        method: 'POST',
        body: JSON.stringify({
          level: e.record.get('level'),
          message: JSON.stringify({
            type: e.record.get('type'),
            message: e.record.get('message'),
          }),
          timestamp: e.record.get('created'),
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    }

    $app.runInTransaction((txApp) => {
      // Use count query instead of pulling all records
      const result = txApp.findRecordsByFilter('alerts', '', '', 1, 0);
      // We don't have a direct count() in txApp easily,
      // but we can just check if total matches.
      // Actually, PocketBase Dao has total count usually.
      // For now, let's just use a more efficient way or assume it's okay for small batches.
      // But findAllRecords is definitely bad.
      // Let's use a raw query or just skip if we can't count efficiently.

      // Let's just check if we have more than MAX by looking at an offset
      const checkRange = txApp.findRecordsByFilter('alerts', '', '', 1, MAX);
      if (checkRange.length === 0) return;

      const oldest = txApp.findRecordsByFilter(
        'alerts',
        '',
        'created', // oldest first
        DELETE_BATCH,
        0,
      );

      for (const r of oldest) {
        txApp.delete(r);
      }
    });
  } catch (err) {
    console.error('Alert cleanup failed:', err.message || err);
  }

  e.next();
}, 'alerts');
