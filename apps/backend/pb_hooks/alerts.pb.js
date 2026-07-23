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
  // 0. Look up which decoder is marked as "current"
  // ------------------------------------------------
  let currentDecoderId = null;
  try {
    const currentDecoders = $app.findRecordsByFilter(
      'decoders',
      'currentDecoder = true',
      '',
      1,
      0,
    );
    if (currentDecoders && currentDecoders.length > 0) {
      currentDecoderId = String(currentDecoders[0].get('decoderId') || '').trim();
    }
  } catch (err) {
    $app.logger().error('alerts.pb.js currentDecoder lookup failed', err.message || err);
  }

  const isCurrentDecoder =
    !currentDecoderId || String(record.get('decoderId') || '').trim() === currentDecoderId;

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
      $app
        .logger()
        .error('alerts.pb.js Delta fetch failed', err.message || err);
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
          if (
            l.active === true ||
            l.active === 'true' ||
            l.active === 1 ||
            l.active === '1'
          ) {
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
    const expectedCounter =
      activeLinkCounter !== null ? activeLinkCounter : fallbackCounter;
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
  // 3. Preset sequence validation
  // ------------------------------------------------
  let presetStatus = null;
  let presetIndexVal = null;
  let presetIdVal = null;

  function getSetting(key, defaultValue) {
    try {
      const records = $app.findRecordsByFilter(
        'settings',
        "key = '" + key + "'",
        '',
        1,
        0,
      );
      if (records && records.length > 0) {
        return records[0].get('value');
      }
    } catch (err) {
      // ignore
    }
    return defaultValue;
  }

  function setSetting(key, value) {
    try {
      const records = $app.findRecordsByFilter(
        'settings',
        "key = '" + key + "'",
        '',
        1,
        0,
      );
      if (records && records.length > 0) {
        records[0].set('value', String(value));
        $app.save(records[0]);
      } else {
        const collection = $app.findCollectionByNameOrId('settings');
        const r = new Record(collection);
        r.set('key', key);
        r.set('value', String(value));
        $app.save(r);
      }
    } catch (err) {
      $app.logger().error('Failed to save setting: ' + key, err.message || err);
    }
  }

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
      const activeActions = activePreset.expandedAll('actions') || [];

      if (activeActions.length > 0) {
        let storedCounter = parseInt(getSetting('preset_counter', '0'), 10);
        if (isNaN(storedCounter)) storedCounter = 0;
        let storedPresetId = String(getSetting('preset_id', ''));

        let pCurr = null;
        let pCurrActions = [];

        // Handle preset transition at boundary
        if (storedCounter === 0 && storedPresetId !== activePreset.id) {
          storedPresetId = activePreset.id;
          setSetting('preset_id', storedPresetId);
          pCurr = activePreset;
          pCurrActions = activeActions;
        } else {
          // Load pCurr by id
          try {
            if (storedPresetId && storedPresetId !== activePreset.id) {
              pCurr = $app.findRecordById('presets', storedPresetId);
              if (pCurr) {
                $app.expandRecord(pCurr, ['actions'], null);
                pCurrActions = pCurr.expandedAll('actions') || [];
              }
            }
          } catch (e) {
            // Preset might be deleted
          }

          if (!pCurr || pCurrActions.length === 0) {
            pCurr = activePreset;
            pCurrActions = activeActions;
            storedPresetId = activePreset.id;
            setSetting('preset_id', storedPresetId);
          }
        }

        const N = pCurrActions.length;
        const expectedAction = pCurrActions[storedCounter];

        const recordProject = String(record.get('projectId')).trim();
        const recordPayload = String(record.get('payload')).trim();

        const isMatch =
          expectedAction &&
          String(expectedAction.get('project')).trim() === recordProject &&
          String(expectedAction.get('payload')).trim() === recordPayload;

        if (isMatch) {
          presetStatus = 'valid';
          presetIndexVal = storedCounter;
          presetIdVal = storedPresetId;

          if (storedCounter === N - 1) {
            setSetting('preset_counter', 0);
          } else {
            setSetting('preset_counter', storedCounter + 1);
          }
        } else {
          // Case B: Mismatch
          // 1. Check for aborted transition to new preset
          const isTransitionMatch =
            storedPresetId !== activePreset.id &&
            activeActions[0] &&
            String(activeActions[0].get('project')).trim() === recordProject &&
            String(activeActions[0].get('payload')).trim() === recordPayload;

          const isFirstActionOfCurrentPreset =
            pCurrActions[0] &&
            String(pCurrActions[0].get('project')).trim() === recordProject &&
            String(pCurrActions[0].get('payload')).trim() === recordPayload;

          if (isTransitionMatch) {
            presetStatus = 'incomplete_old_preset';
            presetIndexVal = 0;
            presetIdVal = activePreset.id;

            setSetting('preset_id', activePreset.id);
            setSetting('preset_counter', 1);
          } else if (isFirstActionOfCurrentPreset) {
            presetStatus = 'unexpected_action';
            presetIndexVal = 0;
            presetIdVal = storedPresetId;

            setSetting('preset_counter', 1);
          } else {
            // 2. Otherwise: Reset counter to 0
            setSetting('preset_counter', 0);

            // Check if matches any action in the current preset
            let foundInCurr = false;
            for (let i = 0; i < N; i++) {
              if (
                String(pCurrActions[i].get('project')).trim() ===
                  recordProject &&
                String(pCurrActions[i].get('payload')).trim() === recordPayload
              ) {
                foundInCurr = true;
                break;
              }
            }

            presetStatus = foundInCurr
              ? 'incorrect_order'
              : 'unexpected_action';
            presetIndexVal = storedCounter;
            presetIdVal = storedPresetId;
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('alerts.pb.js Preset Check failed', err.message || err);
  }

  // ------------------------------------------------
  // Create ONE alert record with all results
  // (only for the decoder marked as "current")
  // ------------------------------------------------
  if (isCurrentDecoder) {
    try {
      const issues = [];
      if (isMagicCorrect === false) issues.push('magic mismatch');
      if (isCounterCorrect === false)
        issues.push(counterIssue || 'counter not increasing');
      if (presetStatus && presetStatus !== 'valid') {
        issues.push('preset validation failed: ' + presetStatus);
      }

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
          presetStatus,
          presetId: presetIdVal,
          presetIndex: presetIndexVal,
          log: logData,
        }),
      );
      $app.save(alert);
    } catch (err) {
      console.error('Failed to save alert:', err.message || err);
    }
  }

  // ------------------------------------------------
  // Stamp validation results onto the leo record itself
  // so the frontend can read them at arrival time.
  // ------------------------------------------------
  try {
    let changed = false;
    if (isCounterCorrect !== null) {
      record.set('isCounterCorrect', isCounterCorrect);
      changed = true;
    }
    if (presetStatus !== null) {
      record.set('presetId', presetIdVal);
      record.set('presetIndex', presetIndexVal);
      record.set('presetStatus', presetStatus);
      changed = true;
    }
    if (changed) {
      $app.save(record);
    }
  } catch (err) {
    $app.logger().error('alerts.pb.js Stamp fields failed', err.message || err);
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
          source: 'MB',
          metadata: e.record.get('metadata'),
          timestamp: e.record.get('created'),
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Alert cleanup failed:', err.message || err);
  }

  e.next();
}, 'alerts');
