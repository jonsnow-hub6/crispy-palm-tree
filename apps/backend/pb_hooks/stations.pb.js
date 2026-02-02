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
