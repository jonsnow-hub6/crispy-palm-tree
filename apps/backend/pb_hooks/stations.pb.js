/// <reference path="../pb_data/types.d.ts" />


// Activation endpoint: attempts to activate ONE link of target station (failover style).
routerAdd('POST', '/api/stations/{id}/activate', async (c) => {
  let notifications = $app.findCollectionByNameOrId('notifications');
  let notification = new Record(notifications);
  
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
      notification.set("level", "error");
      notification.set("type", "connection");
      notification.set("content", `Failed to activate station "${newStation.get('name')}" - no links reachable`);
      $app.save(notification);

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

        notification.set("level", "error");
        notification.set("type", "connection");
        notification.set("content", `Failed to deactivate previous station "${prevStation.get('name')}" after activating "${newStation.get('name')}" - rollback applied`);
        $app.save(notification);

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

    notification.set("level", "info");
    notification.set("type", "connection");
    notification.set("content", `Station "${newStation.get('name')}" activated successfully${prevStation ? `, previous station was "${prevStation.get('name')}"` : ''}`);
    $app.save(notification);

    // 6️⃣ Success
    return c.json(200, {
      success: true,
      message: 'Station activated successfully',
      activatedLink: activatedLink,
    });

  } catch (err) {
    console.error('Station activation error:', err);

    notification.set("level", "error");
    notification.set("type", "connection");
    notification.set("content", `Error during station activation: ${err.message || String(err)}`);
    $app.save(notification);

    return c.json(500, {
      error: err.message || 'Internal server error',
    });
  }
});


// Deactivation endpoint: deactivates ALL active links of target station
routerAdd('POST', '/api/stations/{id}/deactivate', async (c) => {
  let notifications = $app.findCollectionByNameOrId('notifications');
  let notification = new Record(notifications);

  try {
    const { deactivateLink, probeLink } = require(
      `${__hooks}/api.utils`,
    );

    const id = c.request.pathValue('id');
    const station = $app.findRecordById('stations', id);

    if (!station) {
      return c.json(404, { error: 'Station not found' });
    }

    let links = JSON.parse(station.get('stationLinks') || '[]');

    const activeLinks = links.filter((l) => l.active === true);

    // Nothing to deactivate
    if (activeLinks.length === 0) {
      return c.json(200, {
        success: true,
        message: 'Station already inactive',
      });
    }

    // Probe first (optional safety)
    const probes = await Promise.all(
      activeLinks.map(probeLink),
    );

    const reachable = probes.some((r) => r.ok);

    // Deactivate in parallel
    const results = await Promise.all(
      activeLinks.map(deactivateLink),
    );

    const failed = results.some((r) => !r.ok);

    if (failed) {
      notification.set('level', 'error');
      notification.set('type', 'connection');
      notification.set(
        'content',
        `Failed to fully deactivate station "${station.get('name')}"`
      );

      $app.save(notification);

      return c.json(409, {
        success: false,
        message: 'Some links failed to deactivate',
        results,
      });
    }

    // Persist inactive state
    const updatedLinks = links.map((l) => ({
      ...l,
      active: false,
    }));

    station.set(
      'stationLinks',
      JSON.stringify(updatedLinks),
    );

    $app.save(station);

    notification.set('level', 'info');
    notification.set('type', 'connection');
    notification.set(
      'content',
      `Station "${station.get('name')}" deactivated successfully`
    );

    $app.save(notification);

    return c.json(200, {
      success: true,
      message: 'Station deactivated successfully',
    });

  } catch (err) {
    console.error('Station deactivation error:', err);

    notification.set('level', 'error');
    notification.set('type', 'connection');
    notification.set(
      'content',
      `Error during station deactivation: ${err.message || String(err)}`
    );

    $app.save(notification);

    return c.json(500, {
      error: err.message || 'Internal server error',
    });
  }
});
