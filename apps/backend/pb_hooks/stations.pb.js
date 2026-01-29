/// <reference path="../pb_data/types.d.ts" />

// Activation endpoint: attempts to activate all links of target station.
routerAdd('POST', '/api/stations/{id}/activate', async (c) => {
  try {
    const { activateLink, deactivateLink, probeLink } = require(
      `${__hooks}/api.utils`,
    );
    const id = c.request.pathValue('id');
    const newStation = $app.findRecordById('stations', id);
    if (!newStation) return c.json(404, { error: 'Station not found' });

    const newLinks = JSON.parse(newStation.get('stationLinks') || '[]');

    // 1️⃣ Find previously active station (DB only)
    const stations = $app.findRecordsByFilter('stations', '');
    const prevStation = stations.find((s) => {
      if (s.id === newStation.id) return false;
      const links = JSON.parse(s.get('stationLinks') || '[]');
      return links.some((l) => l.active === true);
    });

    let prevLinks = [];
    let prevIsReachable = false;

    // 2️⃣ Probe previous station links (parallel)
    if (prevStation) {
      prevLinks = JSON.parse(prevStation.get('stationLinks') || '[]');
      const probeResults = await Promise.all(prevLinks.map(probeLink));
      prevIsReachable = probeResults.some((r) => r.ok);
    }

    // 3️⃣ Activate new station (parallel)
    const activationResults = await Promise.all(newLinks.map(activateLink));
    const newActivated = activationResults.filter((r) => r.ok);

    if (newActivated.length === 0) {
      return c.json(400, {
        success: false,
        message: 'Failed to activate new station – no links activated',
        results: activationResults,
      });
    }

    // Persist new station active flags
    const updatedNewLinks = newLinks.map((l) => ({
      ...l,
      active: newActivated.some(
        (a) => a.link.host === l.host && a.link.port === l.port,
      ),
    }));
    newStation.set('stationLinks', JSON.stringify(updatedNewLinks));
    $app.save(newStation);

    // 4️⃣ Deactivate previous station ONLY after success
    if (prevStation && prevIsReachable) {
      const deactivationResults = await Promise.all(
        prevLinks.filter((link) => link.active).map(deactivateLink),
      );
      const failed = deactivationResults.some((r) => !r.ok);

      if (failed) {
        // 🔁 Rollback new station
        await Promise.all(updatedNewLinks.map(deactivateLink));

        newStation.set(
          'stationLinks',
          JSON.stringify(updatedNewLinks.map((l) => ({ ...l, active: false }))),
        );
        $app.save(newStation);

        return c.json(409, {
          success: false,
          message: 'Failed to deactivate previous station, rollback applied',
        });
      }

      // Persist previous station inactive
      prevStation.set(
        'stationLinks',
        JSON.stringify(prevLinks.map((l) => ({ ...l, active: false }))),
      );
      $app.save(prevStation);
    }

    return c.json(200, {
      success: true,
      message: 'Station activated successfully',
      activatedLinks: newActivated.length,
    });
  } catch (err) {
    console.error('Station activation error:', err);
    return c.json(500, { error: err.message });
  }
});

// Monitoring & counters: run periodically inside the PB server using cronAdd
// Runs every 5 seconds (if PocketBase cron supports seconds). If not, adjust schedule to a supported interval.

// Use a minute-based cron expression (every minute). If you need higher frequency,
// adjust according to your PocketBase cron support; some environments do not support seconds.
cronAdd('stations_monitor', '*/1 * * * *', () => {
  try {
    const { httpGetCounter, httpGetActive } = require(
      `${__hooks}/api.utils`,
    );
    const allStations = $app.findRecordsByFilter('stations', '');
    const counters = [];
    const stationUpdates = [];

    for (const st of allStations) {
      const links = JSON.parse(st.get('stationLinks') || '[]');
      const updatedLinks = [];
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const activeRes = httpGetActive(link);
        const counterRes = httpGetCounter(link);
        const reachable = activeRes.ok || counterRes.ok;
        const active = activeRes.ok ? !!activeRes.value : false;
        const counter = counterRes.ok ? counterRes.value : null;
        if (counter !== null) counters.push(counter);

        updatedLinks.push({ ...link, reachable, active, counter });
      }
      st.set('stationLinks', JSON.stringify(updatedLinks));
      stationUpdates.push(st);
    }

    // Check counter consistency across all reachable counters
    const uniqueCounters = Array.from(new Set(counters));
    const countersConsistent = uniqueCounters.length <= 1;

    // Persist station updates and flag counterMismatch if any
    for (const st of stationUpdates) {
      st.set('counterMismatch', !countersConsistent);
      $app.save(st);
    }

    // Enforce single active station: if multiple stations report active links, keep first and deactivate others
    const updatedAll = $app.findRecordsByFilter('stations', '');
    const activeStations = updatedAll.filter((s) => {
      const links = JSON.parse(s.get('stationLinks') || '[]');
      return links.some((l) => l.active === true);
    });
    if (activeStations.length > 1) {
      const keeper = activeStations[0];
      for (const other of activeStations.slice(1)) {
        const otherLinks = JSON.parse(other.get('stationLinks') || '[]');
        const deactivated = otherLinks.map((l) => ({ ...l, active: false }));
        other.set('stationLinks', JSON.stringify(deactivated));
        $app.save(other);
        // attempt remote deactivation
        for (const l of otherLinks) {
          try {
            httpPostSetActive(l, false);
          } catch (e) {}
        }
      }
      // ensure keeper remains active (if not, try to activate one link)
      const keeperLinks = JSON.parse(keeper.get('stationLinks') || '[]');
      if (!keeperLinks.some((l) => l.active)) {
        // try to activate first reachable link
        for (let i = 0; i < keeperLinks.length; i++) {
          const l = keeperLinks[i];
          const res = httpPostSetActive(l, true);
          const verify = httpGetActive(l);
          if (res.ok && verify.ok && verify.value) {
            keeperLinks[i].active = true;
            break;
          }
        }
        keeper.set('stationLinks', JSON.stringify(keeperLinks));
        $app.save(keeper);
      }
    }
  } catch (err) {
    console.error('stations monitor cron error:', err);
  }
});
