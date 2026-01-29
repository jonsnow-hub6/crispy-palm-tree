/// <reference path="../pb_data/types.d.ts" />

console.log('presets.pb.js loaded');

// Helper function to distribute preset to all station links
async function distributePresetToStations(presetId) {
  const preset = $app.findRecordById('presets', presetId);
  if (!preset) {
    return { success: false, error: 'Preset not found' };
  }

  // Get all actions for this preset
  const actionIds = preset.get('actions') || [];
  const actions = [];
  for (const actionId of actionIds) {
    const action = $app.findRecordById('actions', actionId);
    if (action) {
      const projectId = action.get('project');
      const project = $app.findRecordById('projects', projectId);
      if (project) {
        actions.push({
          project: project.get('name'),
          payload: action.get('payload'),
        });
      }
    }
  }

  const presetData = {
    id: preset.id,
    name: preset.get('name'),
    color: preset.get('color'),
    actions: actions,
  };

  // Get all stations and their links
  const allStations = $app.findRecordsByFilter('stations', '');
  const results = [];

  for (const station of allStations) {
    const stationLinks = JSON.parse(station.get('stationLinks') || '[]');
    
    for (const link of stationLinks) {
      try {
        const url = `http://${link.host}:${link.port}/api/setPreset`;
        const response = $http.send({
          url: url,
          method: 'POST',
          body: JSON.stringify(presetData),
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        });

        results.push({
          station: station.get('name'),
          link: `${link.host}:${link.port}`,
          success: response.statusCode === 200,
          error: response.statusCode !== 200 ? response.body : null,
        });
      } catch (error) {
        results.push({
          station: station.get('name'),
          link: `${link.host}:${link.port}`,
          success: false,
          error: error.toString(),
        });
      }
    }
  }

  return { success: true, results };
}

// Preset distribution endpoint is implemented in projects.pb.js to avoid duplicate registration

// Hook: When preset is updated and it's the active one, distribute it
onRecordAfterUpdateSuccess((e) => {
  try {
    if (!e || !e.record) return;
    const record = e.record;
    const coll = record.collection || {};
    if (!(coll.name === 'presets' || coll.id === 'presets')) return;
    // Distribute preset to all stations
    distributePresetToStations(record.id).then((result) => {
      console.log('Preset auto-distributed:', record.get('name'), result);
    });
  } catch (err) {
    console.error('onRecordAfterUpdateSuccess(presets) handler error:', err);
  }
});
