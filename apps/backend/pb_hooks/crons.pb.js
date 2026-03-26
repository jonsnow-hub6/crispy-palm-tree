/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/cron/probe-all', async (c) => {
  const notifications = $app.findCollectionByNameOrId('notifications');

  // --- HELPER FUNCTION TO PREVENT SPAM ---
  const createNotification = (level, type, content, stationName = '') => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)
      .toISOString()
      .replace('T', ' ');

    // Check if an identical notification exists in the last 30 seconds
    // We escape single quotes in content to prevent filter errors
    const notificationsByFilter = $app.findRecordsByFilter(
      'notifications',
      `content = '${content}'`,
    );

    const existingNotification = notificationsByFilter.find((n) => {
      return n.get('created') >= thirtySecondsAgo;
    });

    if (!existingNotification) {
      const record = new Record(notifications);
      record.set('level', level);
      record.set('type', type);
      record.set('content', content);
      if (stationName) record.set('stationName', stationName);
      $app.save(record);
    }
  };

  try {
    const { httpGetCounter, probeLink, httpGetPreset } = require(
      `${__hooks}/api.utils`,
    );
    const stations = $app.findRecordsByFilter('stations', '');
    let allCounters = [];
    let counterDecreased = false;

    const activeStation = stations.find((st) => {
      const links = JSON.parse(st.get('stationLinks') || '[]');
      return links.some((l) => l.active === true);
    });

    let isActive = false;

    for (const st of stations) {
      let links = [];
      try {
        links = JSON.parse(st.get('stationLinks') || '[]');
      } catch {
        links = [];
      }

      links = links.map((l) => ({
        ...l,
        active:
          l.active === true ||
          l.active === 'true' ||
          l.active === 1 ||
          l.active === '1'
            ? true
            : false,
      }));

      const counterProbes = await Promise.all(
        links.map((l) => httpGetCounter(l)),
      );
      const activeProbes = await Promise.all(links.map((l) => probeLink(l)));
      const updatedLinks = JSON.parse(JSON.stringify(links));

      for (let i = 0; i < links.length; i++) {
        const existing = links[i];
        const counterProbe = counterProbes[i] || { ok: false };
        const activeProbe = activeProbes[i] || { ok: false, reachable: false };

        updatedLinks[i] = {
          ...existing,
          reachable: !!(counterProbe.ok || activeProbe.reachable),
          counter: counterProbe.ok
            ? counterProbe.value
            : (existing.counter ?? null),
          active: activeProbe.ok
            ? true
            : activeProbe.reachable
              ? false
              : existing.active === true,
        };

        try {
          const presetRes = await httpGetPreset(existing);
          if (presetRes.ok && presetRes.value) {
            updatedLinks[i].currentPreset =
              presetRes.value.presetName || 'unknown';
            updatedLinks[i].reachable = true;
          } else {
            createNotification(
              'error',
              'connection',
              `Failed to get preset from station "${st.get('name')}" (${existing.host}:${existing.port}) - ${presetRes.error}`,
              st.get('name'),
            );
            updatedLinks[i].currentPreset = 'unknown';
          }
        } catch (e) {
          createNotification(
            'error',
            'connection',
            `Error fetching preset from ${existing.host}:${existing.port} - ${String(e)}`,
            st.get('name'),
          );
          updatedLinks[i].currentPreset = 'unknown';
        }
      }

      const activeLinks = updatedLinks.filter((l) => l.active === true);

      if (activeLinks.length === 1 && !activeLinks[0].reachable) {
        createNotification(
          'critical',
          'connection',
          `Station ${st.get('name')} has one active link but it's unreachable`,
          st.get('name'),
        );
      }

      if (activeLinks.length > 1) {
        createNotification(
          'critical',
          'connection',
          `Station ${st.get('name')} has multiple active links (${activeLinks.length})`,
          st.get('name'),
        );
      }

      if (activeLinks.length > 0 && isActive) {
        createNotification(
          'critical',
          'connection',
          `Station ${st.get('name')} has active link while another station is active`,
          st.get('name'),
        );
      }

      isActive = activeLinks.length > 0 || isActive;

      for (let i = 0; i < links.length; i++) {
        const old = links[i];
        const updated = updatedLinks[i];

        if (old?.active === true && updated?.active === false) {
          createNotification(
            'error',
            'connection',
            `Link ${old.host}:${old.port} became inactive`,
            st.get('name'),
          );
        }

        if (activeStation && st.id === activeStation.id) {
          if (!updatedLinks.some((l) => l.active === true)) {
            createNotification(
              'critical',
              'connection',
              `Active station ${st.get('name')} has no active links`,
              st.get('name'),
            );
          }
        }

        if (
          typeof old?.counter === 'number' &&
          typeof updated?.counter === 'number'
        ) {
          if (updated.counter < old.counter) counterDecreased = true;
          allCounters.push(updated.counter);
        }
      }

      if (activeStation && st.id === activeStation.id) {
        if (!updatedLinks.some((l) => l.reachable)) {
          createNotification(
            'critical',
            'connection',
            `Active station ${activeStation.get('name')} is unreachable`,
            activeStation.get('name'),
          );
        }
      }

      st.set('stationLinks', JSON.stringify(updatedLinks));
      $app.save(st);
    }

    if (counterDecreased) {
      createNotification(
        'error',
        'counter',
        'Counter decreased on at least one link',
      );
    }

    const uniqueCounters = Array.from(new Set(allCounters));
    if (uniqueCounters.length > 1) {
      createNotification(
        'warning',
        'counter',
        `Global counter mismatch detected across stations`,
      );
    }

    if (!isActive) {
      createNotification(
        'critical',
        'connection',
        `No active stations detected`,
      );
    }

    return c.json(200, { success: true });
  } catch (err) {
    // Fallback for unexpected logic errors
    const msg = `Error during probe-all cron: ${String(err)}`;
    createNotification('error', 'system', msg);
    console.error(err?.stack || err);
    return c.json(500, { error: String(err) });
  }
});
