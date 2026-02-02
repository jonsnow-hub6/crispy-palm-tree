/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/presets/{id}/set', async (c) => {
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
        id: projectId,               // project id
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
        try {
          const res = httpPostSetPreset(link, presetPayload);
          return {
            stationId,
            stationName,
            host: link.host,
            port: link.port,
            ok: res.ok,
            error: res.ok ? null : res.error,
          };
        } catch (err) {
          return {
            stationId,
            stationName,
            host: link.host,
            port: link.port,
            ok: false,
            error: String(err),
          };
        }
      })
    );

    return c.json(200, {
      success: true,
      preset: presetPayload,
      results,
    });

  } catch (err) {
    console.error('Preset distribution error:', err?.stack || err);
    return c.json(500, { error: String(err) });
  }
});

console.log('presets.pb.js: /api/presets/{id}/set registered');
