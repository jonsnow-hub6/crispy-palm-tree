/// <reference path="../pb_data/types.d.ts" />

// Activation endpoint: attempts to activate ONE link of target station (failover style).
routerAdd('POST', '/api/stations/{id}/activate', async (c) => {
  try {
    const { activateLink, deactivateLink, probeLink } = require(
      `${__hooks}/api.utils`,
    );

    const id = c.request.pathValue('id');
    const newStation = $app.findRecordById('stations', id);

    if (!newStation) {
      return c.json(404, { error: 'Station not found' });
    }

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

      const probeResults = await Promise.all(
        prevLinks.map(probeLink),
      );

      prevIsReachable = probeResults.some((r) => r.ok);
    }

    // 3️⃣ Activate new station (SEQUENTIAL - failover)
    let activatedLink = null;
    const activationResults = [];

    for (const link of newLinks) {
      try {
        const res = await activateLink(link);

        activationResults.push(res);

        if (res.ok) {
          activatedLink = res.link;
          break; // ✅ stop on first success
        }
      } catch (err) {
        activationResults.push({
          ok: false,
          error: err.message,
          link,
        });
      }
    }

    // If none activated → fail (same behavior as before)
    if (!activatedLink) {
      return c.json(400, {
        success: false,
        message: 'Failed to activate new station – no links activated',
        results: activationResults,
      });
    }

    // 4️⃣ Persist new station (ONLY one active link)
    const updatedNewLinks = newLinks.map((l) => ({
      ...l,
      active:
        l.host === activatedLink.host &&
        l.port === activatedLink.port,
    }));

    newStation.set(
      'stationLinks',
      JSON.stringify(updatedNewLinks),
    );

    $app.save(newStation);

    // 5️⃣ Deactivate previous station ONLY after success
    if (prevStation && prevIsReachable) {
      const deactivationResults = await Promise.all(
        prevLinks
          .filter((l) => l.active)
          .map(deactivateLink),
      );

      const failed = deactivationResults.some(
        (r) => !r.ok,
      );

      if (failed) {
        // 🔁 Rollback new station
        await Promise.all(
          updatedNewLinks
            .filter((l) => l.active)
            .map(deactivateLink),
        );

        newStation.set(
          'stationLinks',
          JSON.stringify(
            updatedNewLinks.map((l) => ({
              ...l,
              active: false,
            })),
          ),
        );

        $app.save(newStation);

        return c.json(409, {
          success: false,
          message:
            'Failed to deactivate previous station, rollback applied',
        });
      }

      // Persist previous station inactive
      prevStation.set(
        'stationLinks',
        JSON.stringify(
          prevLinks.map((l) => ({
            ...l,
            active: false,
          })),
        ),
      );

      $app.save(prevStation);
    }

    // 6️⃣ Success
    return c.json(200, {
      success: true,
      message: 'Station activated successfully',
      activatedLink: activatedLink,
    });

  } catch (err) {
    console.error('Station activation error:', err);

    return c.json(500, {
      error: err.message || 'Internal server error',
    });
  }
});
