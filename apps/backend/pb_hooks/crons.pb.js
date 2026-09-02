/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/cron/probe-all', async (c) => {
  const { getSystemMetadata } = require(`${__hooks}/api.utils`);
  const notifications = $app.findCollectionByNameOrId('notifications');

  // Fetch recent notifications to use as state context
  const recentNotifications = $app.findRecordsByFilter(
    'notifications',
    '1=1',
    '-created',
    500,
    0,
  );

  const PAIRS = {
    preset: {
      isMatch: (c, args) => c.includes('preset') && c.includes(args.hostPort),
      isBad: (c) => c.includes('Failed to') || c.includes('Error fetching'),
    },
    active_unreachable: {
      isMatch: (c, args) =>
        (c.includes('has one active link') ||
          (c.includes('active link') && c.includes('is now reachable'))) &&
        c.includes(args.stationName),
      isBad: (c) => c.includes('unreachable'),
    },
    multiple_active: {
      isMatch: (c) =>
        c.includes('multiple active links') ||
        c.includes('while another station is active') ||
        c.includes('Only one link is active across all stations'),
      isBad: (c) => c.includes('multiple') || c.includes('while another'),
    },
    link_inactive: {
      isMatch: (c, args) => c.includes(`Link ${args.hostPort} became`),
      isBad: (c) => c.includes('inactive'),
    },
    active_station_no_links: {
      isMatch: (c, args) =>
        c.includes(`Active station ${args.stationName} has`) &&
        c.includes('active link'),
      isBad: (c) => c.includes('has no'),
    },
    active_station_unreachable: {
      isMatch: (c, args) =>
        c.includes(`Active station ${args.stationName} is`) &&
        c.includes('reachable'),
      isBad: (c) => c.includes('is unreachable'),
    },
    counter_decreased: {
      isMatch: (c) =>
        c.includes('Counter did not increase') ||
        c.includes('Counter increased'),
      isBad: (c) => c.includes('did not increase'),
    },
    counter_mismatch: {
      isMatch: (c) => c.includes('Global counter'),
      isBad: (c) => c.includes('mismatch'),
    },
    no_active_stations: {
      isMatch: (c) =>
        c.toLowerCase().includes('active station') &&
        c.toLowerCase().includes('detected'),
      isBad: (c) => c.toLowerCase().includes('no active'),
    },
  };

  const createNotification = (
    level,
    type,
    content,
    stationName = '',
    pairKey = null,
    pairArgs = {},
    isBadState = true,
    relevantStation = null,
  ) => {
    if (pairKey && PAIRS[pairKey]) {
      const pair = PAIRS[pairKey];
      const lastMatch = recentNotifications.find((n) =>
        pair.isMatch(n.get('content'), pairArgs),
      );

      if (lastMatch) {
        const lastContent = lastMatch.get('content');
        const wasBad = pair.isBad(lastContent);
        if (isBadState && wasBad) return;
        if (!isBadState && !wasBad) return;
      }

      const record = new Record(notifications);
      record.set('level', level);
      record.set('type', type);
      record.set('content', content);
      if (stationName) record.set('stationName', stationName);
      record.set(
        'metadata',
        JSON.stringify(getSystemMetadata(relevantStation)),
      );
      $app.save(record);
      recentNotifications.unshift(record);
      return;
    }

    // Default 30s deduplication for non-paired notifications
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)
      .toISOString()
      .replace('T', ' ');
    const existingNotification = recentNotifications.find((n) => {
      return (
        n.get('content') === content && n.get('created') >= thirtySecondsAgo
      );
    });

    if (!existingNotification) {
      const record = new Record(notifications);
      record.set('level', level);
      record.set('type', type);
      record.set('content', content);
      if (stationName) record.set('stationName', stationName);
      record.set(
        'metadata',
        JSON.stringify(getSystemMetadata(relevantStation)),
      );
      $app.save(record);
      recentNotifications.unshift(record);
    }
  };

  try {
    const { httpGetCounter, probeLink, httpGetPreset } = require(
      `${__hooks}/api.utils`,
    );

    const currentPreset = $app.findRecordsByFilter('presets', 'active = true');

    const stations = $app.findRecordsByFilter('stations', '');
    let allCounters = [];
    let counterDecreased = false;
    let counterIncreased = false;
    let totalActiveLinksCount = 0;

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
            createNotification(
              'info',
              'connection',
              `Successfully got preset from station "${st.get('name')}" (${existing.host}:${existing.port})`,
              st.get('name'),
              'preset',
              { hostPort: `${existing.host}:${existing.port}` },
              false,
              { record: st, link: existing },
            );
            if (
              presetRes.value.presetName !== existing.currentPreset &&
              currentPreset.length > 0 &&
              currentPreset[0].get('name') !== presetRes.value.presetName
            ) {
              const recordPreset = new Record(notifications);
              recordPreset.set('level', 'warning');
              recordPreset.set('type', 'preset');
              recordPreset.set(
                'content',
                `Preset changed from "${existing.currentPreset}" to "${presetRes.value.presetName}" on station "${st.get('name')}" (${existing.host}:${existing.port})`,
              );
              recordPreset.set('stationName', st.get('name'));
              recordPreset.set(
                'metadata',
                JSON.stringify(
                  getSystemMetadata({ record: st, link: existing }),
                ),
              );
              $app.save(recordPreset);
            }
          } else {
            createNotification(
              'error',
              'connection',
              `Failed to get preset from station "${st.get('name')}" (${existing.host}:${existing.port}) - ${presetRes.error}`,
              st.get('name'),
              'preset',
              { hostPort: `${existing.host}:${existing.port}` },
              true,
              { record: st, link: existing },
            );
            updatedLinks[i].currentPreset = 'unknown';
          }
        } catch (e) {
          createNotification(
            'error',
            'connection',
            `Error fetching preset from ${existing.host}:${existing.port} - ${String(e)}`,
            st.get('name'),
            'preset',
            { hostPort: `${existing.host}:${existing.port}` },
            true,
            { record: st, link: existing },
          );
          updatedLinks[i].currentPreset = 'unknown';
        }
      }

      const activeLinks = updatedLinks.filter((l) => l.active === true);
      totalActiveLinksCount += activeLinks.length;

      if (activeLinks.length === 1 && !activeLinks[0].reachable) {
        createNotification(
          'critical',
          'connection',
          `Station ${st.get('name')} has one active link (${activeLinks[0].host}:${activeLinks[0].port}) but it's unreachable`,
          st.get('name'),
          'active_unreachable',
          { stationName: st.get('name') },
          true,
          { record: st, link: activeLinks[0] },
        );
      } else if (activeLinks.length === 1 && activeLinks[0].reachable) {
        createNotification(
          'info',
          'connection',
          `Station ${st.get('name')} active link (${activeLinks[0].host}:${activeLinks[0].port}) is now reachable`,
          st.get('name'),
          'active_unreachable',
          { stationName: st.get('name') },
          false,
          { record: st, link: activeLinks[0] },
        );
      }

      if (activeLinks.length > 1) {
        createNotification(
          'critical',
          'connection',
          `Station ${st.get('name')} has multiple active links (${activeLinks.map((l) => `${l.host}:${l.port}`).join(', ')})`,
          st.get('name'),
          'multiple_active',
          {},
          true,
          { record: st },
        );
      }

      if (activeLinks.length > 0 && isActive) {
        createNotification(
          'critical',
          'connection',
          `Station ${st.get('name')} has active link while another station is active`,
          st.get('name'),
          'multiple_active',
          {},
          true,
          { record: st },
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
            'link_inactive',
            { hostPort: `${old.host}:${old.port}` },
            true,
            { record: st, link: old },
          );
        } else if (old?.active === false && updated?.active === true) {
          createNotification(
            'info',
            'connection',
            `Link ${updated.host}:${updated.port} became active`,
            st.get('name'),
            'link_inactive',
            { hostPort: `${updated.host}:${updated.port}` },
            false,
            { record: st, link: updated },
          );
        }

        if (activeStation && st.id === activeStation.id) {
          if (!updatedLinks.some((l) => l.active === true)) {
            createNotification(
              'critical',
              'connection',
              `Active station ${st.get('name')} has no active links`,
              st.get('name'),
              'active_station_no_links',
              { stationName: st.get('name') },
              true,
              { record: st },
            );
          } else {
            createNotification(
              'info',
              'connection',
              `Active station ${st.get('name')} has an active link`,
              st.get('name'),
              'active_station_no_links',
              { stationName: st.get('name') },
              false,
              { record: st },
            );
          }
        }

        if (
          typeof old?.counter === 'number' &&
          typeof updated?.counter === 'number'
        ) {
          if (updated.counter <= old.counter) counterDecreased = true;
          if (updated.counter > old.counter) counterIncreased = true;
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
            'active_station_unreachable',
            { stationName: activeStation.get('name') },
            true,
            { record: activeStation },
          );
        } else {
          createNotification(
            'info',
            'connection',
            `Active station ${activeStation.get('name')} is reachable again`,
            activeStation.get('name'),
            'active_station_unreachable',
            { stationName: activeStation.get('name') },
            false,
            { record: activeStation },
          );
        }
      }

      st.set('stationLinks', JSON.stringify(updatedLinks));
      $app.save(st);
    }

    if (totalActiveLinksCount === 1) {
      createNotification(
        'info',
        'connection',
        `Only one link is active across all stations`,
        '',
        'multiple_active',
        {},
        false,
      );
    }

    if (counterDecreased) {
      createNotification(
        'error',
        'counter',
        'Counter did not increase on at least one link',
        '',
        'counter_decreased',
        {},
        true,
      );
    } else if (counterIncreased) {
      createNotification(
        'info',
        'counter',
        'Counter increased on at least one link',
        '',
        'counter_decreased',
        {},
        false,
      );
    }

    const uniqueCounters = Array.from(new Set(allCounters));
    let finalUniqueCount = uniqueCounters.length;
    let isMismatch = false;

    if (uniqueCounters.length > 1) {
      isMismatch = true;
      // Wait 1.5s to check if the mismatch is transient (due to network latency/staggered counting)
      // await new Promise((r) => setTimeout(r, 1500));

      let secondCounters = [];
      for (const st of stations) {
        let links = [];
        try {
          links = JSON.parse(st.get('stationLinks') || '[]');
        } catch {
          links = [];
        }

        const probes = await Promise.all(links.map((l) => httpGetCounter(l)));
        probes.forEach((p) => {
          if (p.ok) secondCounters.push(p.value);
        });
      }

      const secondUnique = Array.from(new Set(secondCounters));
      if (secondUnique.length <= 1) {
        isMismatch = false;
        finalUniqueCount = 1;
      }
    }

    if (isMismatch) {
      createNotification(
        'warning',
        'counter',
        `Global counter mismatch detected across stations`,
        '',
        'counter_mismatch',
        {},
        true,
      );
    } else if (finalUniqueCount === 1 && allCounters.length > 0) {
      createNotification(
        'info',
        'counter',
        `Global counters are matching across stations`,
        '',
        'counter_mismatch',
        {},
        false,
      );
    }

    if (!isActive) {
      createNotification(
        'critical',
        'connection',
        `No active stations detected`,
        '',
        'no_active_stations',
        {},
        true,
      );
    } else {
      createNotification(
        'info',
        'connection',
        `Active station detected`,
        '',
        'no_active_stations',
        {},
        false,
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
