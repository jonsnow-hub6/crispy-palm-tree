/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/presets/{id}/set', async (c) => {
  let notifications = $app.findCollectionByNameOrId('notifications');
  let notification = new Record(notifications);

  try {
    const { httpPostSetPreset } = require(`${__hooks}/api.utils`);
    const id = c.request.pathValue('id');

    const preset = $app.findRecordById('presets', id);
    if (!preset) {
      return c.json(404, { error: 'Preset not found' });
    }

    // ---- deactivate previous active presets ----
    const activePresets = $app.findRecordsByFilter('presets', 'active = true');
    for (const p of activePresets) {
      if (p.id !== preset.id) {
        p.set('active', false);
        $app.save(p);
      }
    }

    // ---- activate current preset ----
    preset.set('active', true);
    $app.save(preset);

    // ---- build preset payload ----
    const actionIds = preset.get('actions') || [];
    const commands = [];

    for (const actionId of actionIds) {
      const action = $app.findRecordById('actions', actionId);
      if (!action) continue;

      const projectId = action.get('project');
      if (!projectId) continue;

      commands.push({
        id: +projectId, // project id
        payload: action.get('payload'),
      });
    }

    const presetPayload = {
      presetName: preset.get('name'),
      commands,
    };

    // ---- collect all station links ----
    const stations = $app.findRecordsByFilter('stations', '');
    const links = [];

    for (const station of stations) {
      const stationLinks = JSON.parse(station.get('stationLinks') || '[]');
      for (const link of stationLinks) {
        links.push({
          stationId: station.id,
          stationName: station.get('name'),
          link,
        });
      }
    }

    // ---- apply preset to all links (no rollback) ----
    const results = await Promise.all(
      links.map(async ({ stationId, stationName, link }) => {
        let errorNotification = new Record(notifications);
        try {
          const res = httpPostSetPreset(link, presetPayload);
          if (!res.ok) {
            errorNotification.set('level', 'error');
            errorNotification.set(
              'content',
              `Failed to send preset to station "${stationName}" at ${link.host}:${link.port} - ${res.error}`,
            );
            $app.save(errorNotification);
          }
          return {
            stationId,
            stationName,
            host: link.host,
            port: link.port,
            ok: res.ok,
            error: res.ok ? null : res.error,
          };
        } catch (err) {
          errorNotification.set('level', 'error');
          errorNotification.set(
            'content',
            `Failed to send preset to station "${stationName}" at ${link.host}:${link.port} - ${String(err)}`,
          );
          $app.save(errorNotification);

          return {
            stationId,
            stationName,
            host: link.host,
            port: link.port,
            ok: false,
            error: String(err),
          };
        }
      }),
    );

    notification.set('level', 'info');
    notification.set('type', 'preset');
    notification.set(
      'content',
      `Preset "${preset.get('name')}" activated and sent to ${results.length} station links`,
    );
    $app.save(notification);

    return c.json(200, {
      success: true,
      preset: presetPayload,
      results,
    });
  } catch (err) {
    notification.set('level', 'error');
    notification.set(
      'content',
      `Error during preset activation - ${String(err)}`,
    );
    $app.save(notification);

    return c.json(500, { error: String(err) });
  }
});

routerAdd('POST', '/api/presets/{id}/set-link', async (c) => {
  const notifications = $app.findCollectionByNameOrId('notifications');
  let notification = new Record(notifications);

  console.error('Received request to set preset for single link');

  try {
    const { httpPostSetPreset } = require(`${__hooks}/api.utils`);

    const id = c.request.pathValue('id');
    const body = c.requestInfo().body;

    const { host, port } = body || {};

    if (!host || !port) {
      return c.json(400, { error: 'Missing host or port' });
    }

    // Find preset
    const preset = $app.findRecordById('presets', id);

    if (!preset) {
      return c.json(404, { error: 'Preset not found' });
    }

    // Build payload
    const actionIds = preset.get('actions') || [];
    const commands = [];

    for (const actionId of actionIds) {
      const action = $app.findRecordById('actions', actionId);
      if (!action) continue;

      const projectId = action.get('project');
      if (!projectId) continue;

      commands.push({
        id: projectId,
        payload: action.get('payload'),
      });
    }

    const presetPayload = {
      presetName: preset.get('name'),
      commands,
    };

    // Send to device
    const res = httpPostSetPreset({ host, port }, presetPayload);

    // =============================
    // Update stationLinks in DB
    // =============================
    const stations = $app.findRecordsByFilter('stations', '');

    for (const station of stations) {
      let links = JSON.parse(station.get('stationLinks') || '[]');

      let changed = false;

      links = links.map((l) => {
        if (l.host === host && l.port === port) {
          changed = true;

          return {
            ...l,
            currentPreset: res.ok ? preset.get('name') : 'unknown',
            reachable: res.ok,
          };
        }

        return l;
      });

      if (changed) {
        station.set('stationLinks', JSON.stringify(links));
        $app.save(station);
      }
    }

    // =============================
    // Notifications
    // =============================
    if (!res.ok) {
      notification.set('level', 'error');
      notification.set('type', 'preset');
      notification.set(
        'content',
        `Failed to send preset "${preset.get('name')}" to ${host}:${port} - ${res.error}`,
      );
    } else {
      notification.set('level', 'info');
      notification.set('type', 'preset');
      notification.set(
        'content',
        `Preset "${preset.get('name')}" sent to ${host}:${port}`,
      );
    }

    $app.save(notification);

    return c.json(200, {
      success: res.ok,
      target: { host, port },
      preset: presetPayload,
      error: res.ok ? null : res.error,
    });
  } catch (err) {
    notification.set('level', 'error');
    notification.set('type', 'preset');
    notification.set(
      'content',
      `Error sending preset to single link - ${String(err)}`,
    );

    $app.save(notification);

    console.error(err?.stack || err);

    return c.json(500, { error: String(err) });
  }
});
