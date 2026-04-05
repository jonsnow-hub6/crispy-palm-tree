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

      const probeResults = await Promise.all(prevLinks.map(probeLink));

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
      notification.set('level', 'error');
      notification.set('type', 'connection');
      notification.set('stationName', newStation.get('name'));
      notification.set(
        'content',
        `Failed to activate station "${newStation.get('name')}" - no links reachable`,
      );
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
      active: l.host === activatedLink.host && l.port === activatedLink.port,
    }));

    newStation.set('stationLinks', JSON.stringify(updatedNewLinks));

    $app.save(newStation);

    // 5️⃣ Deactivate previous station ONLY after success
    if (prevStation && prevIsReachable) {
      const deactivationResults = await Promise.all(
        prevLinks.filter((l) => l.active).map(deactivateLink),
      );

      const failed = deactivationResults.some((r) => !r.ok);

      if (failed) {
        // 🔁 Rollback new station
        await Promise.all(
          updatedNewLinks.filter((l) => l.active).map(deactivateLink),
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

        notification.set('level', 'error');
        notification.set('type', 'connection');
        notification.set('stationName', newStation.get('name'));
        notification.set(
          'content',
          `Failed to deactivate previous station "${prevStation.get('name')}" after activating "${newStation.get('name')}" - rollback applied`,
        );
        $app.save(notification);

        return c.json(409, {
          success: false,
          message: 'Failed to deactivate previous station, rollback applied',
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

    notification.set('level', 'info');
    notification.set('type', 'connection');
    notification.set('stationName', newStation.get('name'));
    notification.set(
      'content',
      `Station "${newStation.get('name')}" activated successfully${prevStation ? `, previous station was "${prevStation.get('name')}"` : ''}`,
    );
    $app.save(notification);

    // 6️⃣ Success
    return c.json(200, {
      success: true,
      message: 'Station activated successfully',
      activatedLink: activatedLink,
    });
  } catch (err) {
    console.error('Station activation error:', err);

    notification.set('level', 'error');
    notification.set('type', 'connection');
    notification.set('stationName', newStation.get('name'));
    notification.set(
      'content',
      `Error during station activation: ${err.message || String(err)}`,
    );
    $app.save(notification);

    return c.json(500, {
      error: err.message || 'Internal server error',
    });
  }
});

// Specific link activation endpoint: activates a specifically provided link
routerAdd('POST', '/api/stations/{id}/activate-link', async (c) => {
  let notifications = $app.findCollectionByNameOrId('notifications');
  let notification = new Record(notifications);

  try {
    const { activateLink, deactivateLink, probeLink } = require(
      `${__hooks}/api.utils`,
    );

    const id = c.request.pathValue('id');
    const body = c.requestInfo().body;
    const { host, port } = body || {};

    if (!host || !port) {
      return c.json(400, { error: 'Missing host or port in request body' });
    }

    const newStation = $app.findRecordById('stations', id);

    if (!newStation) {
      return c.json(404, { error: 'Station not found' });
    }

    const newLinks = JSON.parse(newStation.get('stationLinks') || '[]');
    const specificLink = newLinks.find(
      (l) => l.host === host && l.port === port,
    );

    if (!specificLink) {
      return c.json(404, { error: 'Link not found in station' });
    }

    // 1️⃣ Identify the currently active station & links.
    // It could be the same station (different link) or a different station.
    const stations = $app.findRecordsByFilter('stations', '');
    let prevStation = null;
    let prevLinks = []; // All links in the prev active station
    let prevActiveLinks = []; // Only the active links in prev station

    for (const s of stations) {
      const links = JSON.parse(s.get('stationLinks') || '[]');
      const active = links.filter((l) => l.active === true);

      // We found a station with active links.
      // We identify it as "previous" ONLY IF one of the active links is NOT the link we are targeting.
      const hasOtherActiveLinks = active.some(
        (l) => s.id !== newStation.id || l.host !== host || l.port !== port,
      );

      if (hasOtherActiveLinks) {
        prevStation = s;
        prevLinks = links;
        prevActiveLinks = active;
        break;
      }
    }

    // 2️⃣ Probe previous active links (parallel)
    let prevIsReachable = false;
    if (prevStation) {
      const probeResults = await Promise.all(prevActiveLinks.map(probeLink));
      prevIsReachable = probeResults.some((r) => r.ok);
    }

    // 3️⃣ Activate specific link
    let activatedLink = null;
    let activationResult = null;

    try {
      const res = await activateLink(specificLink);
      activationResult = res;

      if (res.ok) {
        activatedLink = res.link;
      }
    } catch (err) {
      activationResult = {
        ok: false,
        error: err.message,
        link: specificLink,
      };
    }

    // If failed → return error
    if (!activatedLink) {
      notification.set('level', 'error');
      notification.set('type', 'connection');
      notification.set('stationName', newStation.get('name'));
      notification.set(
        'content',
        `Failed to activate link ${host}:${port} in station "${newStation.get('name')}"`,
      );
      $app.save(notification);

      return c.json(400, {
        success: false,
        message: 'Failed to activate the specific link',
        results: [activationResult],
      });
    }

    // 4️⃣ Deactivate previous active links ONLY after success
    let rollbackNeeded = false;
    if (prevStation && prevIsReachable) {
      const deactivationResults = await Promise.all(
        prevActiveLinks.map(deactivateLink),
      );

      const failed = deactivationResults.some((r) => !r.ok);

      if (failed) {
        rollbackNeeded = true;
      }
    }

    // 5️⃣ Rollback if deactivation failed
    if (rollbackNeeded) {
      await deactivateLink(activatedLink); // Undo the new activation

      notification.set('level', 'error');
      notification.set('type', 'connection');
      notification.set('stationName', newStation.get('name'));
      notification.set(
        'content',
        `Failed to deactivate previous active link(s) after activating link in "${newStation.get('name')}" - rollback applied`,
      );
      $app.save(notification);

      return c.json(409, {
        success: false,
        message: 'Failed to deactivate previous active links, rollback applied',
      });
    }

    // 6️⃣ Persist state to DB
    // Update the targeted station to set ONLY the designated link as active
    const updatedNewLinks = newLinks.map((l) => ({
      ...l,
      active: l.host === host && l.port === port,
    }));
    newStation.set('stationLinks', JSON.stringify(updatedNewLinks));
    $app.save(newStation);

    // If the previous active link was in a DIFFERENT station, mark it totally inactive.
    if (prevStation && prevStation.id !== newStation.id) {
      const updatedPrevLinks = prevLinks.map((l) => ({
        ...l,
        active: false,
      }));
      prevStation.set('stationLinks', JSON.stringify(updatedPrevLinks));
      $app.save(prevStation);
    }

    notification.set('level', 'info');
    notification.set('type', 'connection');
    notification.set('stationName', newStation.get('name'));
    notification.set(
      'content',
      `Link ${host}:${port} in station "${newStation.get('name')}" activated successfully${prevStation ? `, previous station was "${prevStation.get('name')}"` : ''}`,
    );
    $app.save(notification);

    // 6️⃣ Success
    return c.json(200, {
      success: true,
      message: 'Specific link activated successfully',
      activatedLink: activatedLink,
    });
  } catch (err) {
    console.error('Specific link activation error:', err);

    notification.set('level', 'error');
    notification.set('type', 'connection');
    notification.set('stationName', newStation.get('name') || 'Unknown');
    notification.set(
      'content',
      `Error during specific link activation: ${err.message || String(err)}`,
    );
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
    const { deactivateLink, probeLink } = require(`${__hooks}/api.utils`);

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
    const probes = await Promise.all(activeLinks.map(probeLink));

    const reachable = probes.some((r) => r.ok);

    // Deactivate in parallel
    const results = await Promise.all(activeLinks.map(deactivateLink));

    const failed = results.some((r) => !r.ok);

    if (failed) {
      notification.set('level', 'error');
      notification.set('type', 'connection');
      notification.set('stationName', station.get('name'));
      notification.set(
        'content',
        `Failed to fully deactivate station "${station.get('name')}"`,
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

    station.set('stationLinks', JSON.stringify(updatedLinks));

    $app.save(station);

    notification.set('level', 'info');
    notification.set('type', 'connection');
    notification.set('stationName', station.get('name'));
    notification.set(
      'content',
      `Station "${station.get('name')}" deactivated successfully`,
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
    notification.set('stationName', station.get('name'));
    notification.set(
      'content',
      `Error during station deactivation: ${err.message || String(err)}`,
    );

    $app.save(notification);

    return c.json(500, {
      error: err.message || 'Internal server error',
    });
  }
});
