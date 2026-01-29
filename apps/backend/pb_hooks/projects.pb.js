/// <reference path="../pb_data/types.d.ts" />

// Store TCP server instances per project
const tcpServers = new Map();

// Helper to create TCP listener for a project
function createTcpListener(project) {
  const projectId = project.id;
  const host = project.get('host');
  const port = project.get('port');
  const address = `${host}:${port}`;

  // Close existing server if any
  if (tcpServers.has(projectId)) {
    try {
      // Note: PocketBase JSVM doesn't have native TCP support
      // This would need to be implemented via Go hooks or external service
      // For now, we'll use HTTP endpoints that projects can POST to
      console.log(`TCP listener for ${address} would be created (requires Go hook)`);
    } catch (error) {
      console.error(`Error closing TCP server for ${address}:`, error);
    }
  }

  // Store placeholder (actual TCP would be in Go hooks)
  tcpServers.set(projectId, { host, port, address });
  console.log(`TCP listener registered for project ${project.get('name')} at ${address}`);
}

// Helper to close TCP listener
function closeTcpListener(projectId) {
  if (tcpServers.has(projectId)) {
    const server = tcpServers.get(projectId);
    console.log(`Closing TCP listener for ${server.address}`);
    tcpServers.delete(projectId);
  }
}

// In-memory storage for packet validation (since schema doesn't have these fields)
// Use a global to ensure availability regardless of file load order
// In production, these fields should be added to projects collection via migration
const packetStore = (globalThis.__packetStore = globalThis.__packetStore || new Map()); // projectId -> { packet, timestamp, valid }

// API endpoint to receive packets from projects (HTTP fallback)
// moved to /api/custom to avoid colliding with PocketBase built-in routes
routerAdd('POST', '/api/custom/projects/:id/packet', (c) => {
  try {
    const projectId = c.pathParam('id');
    const data = $apis.requestInfo(c).data;
    const packet = data?.packet;
    const password = data?.password;

  // Simple password authentication
  const expectedPassword = $app.settings().meta.appName || 'default';
  if (password !== expectedPassword) {
    return c.json(401, { error: 'Unauthorized' });
  }

  if (!packet) {
    return c.json(400, { error: 'Packet data required' });
  }

  const project = $app.findRecordById('projects', projectId);
  if (!project) {
    return c.json(404, { error: 'Project not found' });
  }

  // Get active preset (most recently updated)
  const presets = $app.findRecordsByFilter('presets', '');
  let activePreset = null;
  if (presets.length > 0) {
    activePreset = presets.sort((a, b) => {
      const aTime = new Date(a.get('updated')).getTime();
      const bTime = new Date(b.get('updated')).getTime();
      return bTime - aTime;
    })[0];
  }

  // Validate packet against active preset
  let isValid = false;
  if (activePreset) {
    const actionIds = activePreset.get('actions') || [];
    for (const actionId of actionIds) {
      const action = $app.findRecordById('actions', actionId);
      if (action && action.get('project') === projectId) {
        const expectedPayload = action.get('payload');
        if (String(packet) === String(expectedPayload)) {
          isValid = true;
          break;
        }
      }
    }
  }

    // Store packet data in memory (use global store)
    const timestamp = new Date().toISOString();
    const store = (globalThis.__packetStore = globalThis.__packetStore || new Map());
    store.set(projectId, {
      packet: String(packet),
      timestamp: timestamp,
      valid: isValid,
    });

    return c.json(200, { 
      success: true, 
      valid: isValid,
      timestamp: timestamp,
      message: isValid ? 'Packet validated successfully' : 'Packet validation failed'
    });
  } catch (err) {
    console.error('Error in /api/custom/projects/:id/packet handler:', err && err.stack ? err.stack : err);
    return c.json(500, { error: String(err) });
  }
});

// API endpoint to get packet status for a project
routerAdd('GET', '/api/custom/projects/:id/packet-status', (c) => {
  try {
    const projectId = c.pathParam('id');
    const store = (globalThis.__packetStore || new Map());
    const data = store.get(projectId);
    
    if (!data) {
      return c.json(200, { 
        hasData: false,
        message: 'No packet data received yet'
      });
    }

    // Check if data is within 30-second window
    const now = new Date().getTime();
    const packetTime = new Date(data.timestamp).getTime();
    const windowMs = 30000; // 30 seconds
    const isRecent = (now - packetTime) < windowMs;

    return c.json(200, {
      hasData: true,
      packet: data.packet,
      timestamp: data.timestamp,
      valid: data.valid,
      isRecent: isRecent,
      isHealthy: isRecent && data.valid,
    });
  } catch (err) {
    console.error('Error in /api/custom/projects/:id/packet-status handler:', err && err.stack ? err.stack : err);
    return c.json(500, { error: String(err) });
  }
});

// API endpoint to get system health status
routerAdd('GET', '/api/custom/system/health', (c) => {
  try {
    const projects = $app.findRecordsByFilter('projects', '');
    const now = new Date().getTime();
    const windowMs = 30000; // 30 seconds
    
    let healthyCount = 0;
    let totalCount = projects.length;
    
    for (const project of projects) {
      const store = (globalThis.__packetStore || new Map());
      const data = store.get(project.id);
      if (data) {
        const packetTime = new Date(data.timestamp).getTime();
        const isRecent = (now - packetTime) < windowMs;
        if (isRecent && data.valid) {
          healthyCount++;
        }
      }
    }

    const status = totalCount === 0 ? 'unknown' : 
                   healthyCount === totalCount ? 'healthy' : 'unhealthy';

    return c.json(200, {
      status: status,
      healthy: healthyCount,
      total: totalCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in /api/custom/system/health handler:', err && err.stack ? err.stack : err);
    return c.json(500, { error: String(err) });
  }
});

// simple ping for smoke testing
routerAdd('GET', '/api/custom/ping', (c) => {
  return c.json(200, { ok: true, time: new Date().toISOString() });
});

// alternate distribute endpoint without 'presets' path segment
routerAdd('POST', '/api/custom/distribute/:id', (c) => {
  try {
    const id = c.pathParam('id');
    console.log('POST /api/custom/distribute/:id called with id=', id);

    const preset = $app.findRecordById('presets', id);
    if (!preset) {
      return c.json(404, { success: false, error: 'Preset not found' });
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
          actions.push({ project: project.get('name'), payload: action.get('payload') });
        }
      }
    }

    const presetData = { id: preset.id, name: preset.get('name'), color: preset.get('color'), actions };

    // Distribute to stations
    const allStations = $app.findRecordsByFilter('stations', '');
    const results = [];
    for (const station of allStations) {
      const stationLinks = JSON.parse(station.get('stationLinks') || '[]');
      for (const link of stationLinks) {
        try {
          const url = `http://${link.host}:${link.port}/api/setPreset`;
          const response = $http.send({ url, method: 'POST', body: JSON.stringify(presetData), headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
          results.push({ station: station.get('name'), link: `${link.host}:${link.port}`, success: response.statusCode === 200, error: response.statusCode !== 200 ? response.body : null });
        } catch (err) {
          results.push({ station: station.get('name'), link: `${link.host}:${link.port}`, success: false, error: String(err) });
        }
      }
    }

    console.log('Preset distribution (alternate) result for', id, JSON.stringify(results));
    return c.json(200, { success: true, results });
  } catch (err) {
    console.error('Error in /api/custom/distribute/:id:', err && err.stack ? err.stack : err);
    return c.json(500, { error: String(err) });
  }
});

// API endpoint to trigger preset distribution (duplicate logic here to ensure route is available)
routerAdd('POST', '/api/custom/presets/:id/distribute', (c) => {
  try {
    const id = c.pathParam('id');
    console.log('POST /api/custom/presets/:id/distribute (projects.pb.js) called with id=', id);

    const preset = $app.findRecordById('presets', id);
    if (!preset) {
      return c.json(404, { success: false, error: 'Preset not found' });
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
          actions.push({ project: project.get('name'), payload: action.get('payload') });
        }
      }
    }

    const presetData = { id: preset.id, name: preset.get('name'), color: preset.get('color'), actions };

    // Distribute to stations
    const allStations = $app.findRecordsByFilter('stations', '');
    const results = [];
    for (const station of allStations) {
      const stationLinks = JSON.parse(station.get('stationLinks') || '[]');
      for (const link of stationLinks) {
        try {
          const url = `http://${link.host}:${link.port}/api/setPreset`;
          const response = $http.send({ url, method: 'POST', body: JSON.stringify(presetData), headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
          results.push({ station: station.get('name'), link: `${link.host}:${link.port}`, success: response.statusCode === 200, error: response.statusCode !== 200 ? response.body : null });
        } catch (err) {
          results.push({ station: station.get('name'), link: `${link.host}:${link.port}`, success: false, error: String(err) });
        }
      }
    }

    console.log('Preset distribution (projects.pb.js) result for', id, JSON.stringify(results));
    return c.json(200, { success: true, results });
  } catch (err) {
    console.error('Error in /api/custom/presets/:id/distribute (projects.pb.js):', err && err.stack ? err.stack : err);
    return c.json(500, { error: String(err) });
  }
});

console.log('Project TCP listener and packet validation hooks initialized.');

// Hook: Create TCP listener when project is created
onRecordAfterCreateSuccess((e) => {
  try {
    if (!e || !e.record) return;
    const rec = e.record;
    const coll = rec.collection || {};
    if (coll.name === 'projects' || coll.id === 'projects') {
      createTcpListener(rec);
    }
  } catch (err) {
    console.error('onRecordAfterCreateSuccess(projects) handler error:', err);
  }
});

// Hook: Update TCP listener when project is updated
onRecordAfterUpdateSuccess((e) => {
  try {
    if (!e || !e.record) return;
    const record = e.record;
    const coll = record.collection || {};
    if (coll.name === 'projects' || coll.id === 'projects') {
      closeTcpListener(record.id);
      createTcpListener(record);
    }
  } catch (err) {
    console.error('onRecordAfterUpdateSuccess(projects) handler error:', err);
  }
});

// Hook: Close TCP listener when project is deleted
onRecordDelete((e) => {
  try {
    if (!e || !e.record) return;
    const rec = e.record;
    const coll = rec.collection || {};
    if (coll.name === 'projects' || coll.id === 'projects') {
      closeTcpListener(rec.id);
    }
  } catch (err) {
    console.error('onRecordDelete(projects) handler error:', err);
  }
});
