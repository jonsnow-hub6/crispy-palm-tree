/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  const record = e.record;
  const currentProjectId = record.get('projectId') || '';

  // Full log snapshot stored in the alert metadata
  const logData = {
    id: record.id,
    created: record.get('created'),
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

  // ------------------------------------------------
  // 1. Magic check
  // ------------------------------------------------
  let isMagicCorrect = null;
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
        isMagicCorrect = magicStr === expectedStr;
      }
    }
  } catch (err) {
    $app.logger().error('alerts.pb.js Magic Check failed', err.message || err);
  }

  // ------------------------------------------------
  // 2. Counter check
  // ------------------------------------------------
  let isCounterCorrect = null;
  let counterIssue = '';
  try {
    const currentCounter = Number(record.get('counter') || 0);

    // 2a. Check if counter increases compared to previous log
    let increases = null;
    const prevLogs = $app.findRecordsByFilter(
      'leo',
      `projectId = '${currentProjectId}' && id != '${record.id}'`,
      '-created',
      1,
      0,
    );
    if (prevLogs && prevLogs.length > 0) {
      const prevCounter = Number(prevLogs[0].get('counter') || 0);
      if (currentCounter <= prevCounter) {
        // Safe wrap-around: counter reset from >200 back to <10
        increases = currentCounter < 10 && prevCounter > 200;
      } else {
        increases = true;
      }
    }

    // Get delta from settings
    let delta = 0;
    try {
      const deltaSettings = $app.findRecordsByFilter(
        'settings',
        "key = 'delta'",
        '',
        1,
        0,
      );
      if (deltaSettings && deltaSettings.length > 0) {
        delta = Number(deltaSettings[0].get('value') || 0);
        if (isNaN(delta)) delta = 0;
      }
    } catch (err) {
      $app.logger().error('alerts.pb.js Delta fetch failed', err.message || err);
    }

    // 2b. Check if counter matches the counter of the links
    let matchesLinks = null;
    const stations = $app.findRecordsByFilter('stations', '');
    let activeLinkCounter = null;
    let fallbackCounter = null;
    for (const st of stations) {
      let links = [];
      try {
        links = JSON.parse(st.get('stationLinks') || '[]');
      } catch (e) {
        links = [];
      }
      for (const l of links) {
        if (typeof l.counter === 'number') {
          if (l.active === true || l.active === 'true' || l.active === 1 || l.active === '1') {
            activeLinkCounter = l.counter;
            break;
          }
          if (fallbackCounter === null) {
            fallbackCounter = l.counter;
          }
        }
      }
      if (activeLinkCounter !== null) break;
    }
    const expectedCounter = activeLinkCounter !== null ? activeLinkCounter : fallbackCounter;
    if (expectedCounter !== null) {
      matchesLinks = Math.abs(currentCounter - expectedCounter) <= delta;
    }

    if (increases === false) {
      isCounterCorrect = false;
      counterIssue = 'counter not increasing';
    } else if (matchesLinks === false) {
      isCounterCorrect = false;
      counterIssue = `counter mismatch with station links (expected ${expectedCounter} ± ${delta}, got ${currentCounter})`;
    } else if (increases === true || matchesLinks === true) {
      isCounterCorrect = true;
    }
  } catch (err) {
    $app
      .logger()
      .error('alerts.pb.js Counter Check failed', err.message || err);
  }

  // ------------------------------------------------
  // 3. Is this log in the active preset?
  // 4. Are all preset actions present in recent logs?
  // ------------------------------------------------
  let isLogInPreset = null;
  let areAllPresetActionsInLogs = null;
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
        // Check 3: does this record's payload match any preset action?
        isLogInPreset = false;
        for (let i = 0; i < actions.length; i++) {
          const a = actions[i];
          if (
            String(a.get('project')).trim() ===
              String(currentProjectId).trim() &&
            String(a.get('payload')).trim() ===
              String(record.get('payload')).trim()
          ) {
            isLogInPreset = true;
            break;
          }
        }

        // Check 4: do all preset actions appear in the last 150 leo records?
        const recentLeo = $app.findRecordsByFilter(
          'leo',
          '',
          '-created',
          150,
          0,
        );
        const missingActions = [];
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
          if (!found) {
            missingActions.push({
              project: a.get('project'),
              payload: a.get('payload'),
            });
          }
        }
        areAllPresetActionsInLogs = missingActions.length === 0;
      }
    }
  } catch (err) {
    $app.logger().error('alerts.pb.js Preset Check failed', err.message || err);
  }

  // ------------------------------------------------
  // Create ONE alert record with all results
  // ------------------------------------------------
  try {
    const issues = [];
    if (isMagicCorrect === false) issues.push('magic mismatch');
    if (isCounterCorrect === false) issues.push(counterIssue || 'counter not increasing');
    if (isLogInPreset === false) issues.push('log not in preset');
    if (areAllPresetActionsInLogs === false)
      issues.push('missing preset actions in logs');

    const level = issues.length > 0 ? 'error' : 'info';
    const message =
      issues.length > 0
        ? `Issues for project ${currentProjectId}: ${issues.join(', ')}`
        : `All checks passed for project ${currentProjectId}`;

    const collection = $app.findCollectionByNameOrId('alerts');
    const alert = new Record(collection);
    alert.set('level', level);
    alert.set('message', message);
    alert.set(
      'metadata',
      JSON.stringify({
        isMagicCorrect,
        isCounterCorrect,
        isLogInPreset,
        areAllPresetActionsInLogs,
        log: logData,
      }),
    );
    $app.save(alert);
  } catch (err) {
    console.error('Failed to save alert:', err.message || err);
  }

  // ------------------------------------------------
  // Stamp isCounterCorrect onto the leo record itself
  // so the frontend can read the value as-it-was at
  // arrival time, without re-evaluating against the
  // current (moved) station counter.
  // ------------------------------------------------
  try {
    if (isCounterCorrect !== null) {
      record.set('isCounterCorrect', isCounterCorrect);
      $app.save(record);
    }
  } catch (err) {
    $app
      .logger()
      .error('alerts.pb.js Stamp isCounterCorrect failed', err.message || err);
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
          message: e.record.get('message'),
          metadata: e.record.get('metadata'),
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
