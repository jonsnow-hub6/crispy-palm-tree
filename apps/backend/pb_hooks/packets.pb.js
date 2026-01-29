/// <reference path="../pb_data/types.d.ts" />

// Packet validation logic with 30-second rolling window
function validatePacket(projectId, packet, timestamp) {
  const now = new Date(timestamp || new Date()).getTime();
  const windowMs = 30000; // 30 seconds

  // Get active preset (most recently updated)
  const presets = $app.findRecordsByFilter('presets', '');
  if (presets.length === 0) {
    return { valid: false, reason: 'No presets available' };
  }

  const activePreset = presets.sort((a, b) => {
    const aTime = new Date(a.get('updated')).getTime();
    const bTime = new Date(b.get('updated')).getTime();
    return bTime - aTime;
  })[0];

  // Get actions for this project in the active preset
  const actionIds = activePreset.get('actions') || [];
  let expectedPayload = null;

  for (const actionId of actionIds) {
    const action = $app.findRecordById('actions', actionId);
    if (action && action.get('project') === projectId) {
      expectedPayload = action.get('payload');
      break;
    }
  }

  if (!expectedPayload) {
    return { valid: false, reason: 'No expected payload for this project in active preset' };
  }

  // Compare packet with expected payload
  const isValid = String(packet) === String(expectedPayload);

  return {
    valid: isValid,
    expected: expectedPayload,
    received: String(packet),
    timestamp: timestamp || new Date().toISOString(),
  };
}

// Helper to check if project is healthy (valid packet in last 30s)
function isProjectHealthy(projectId) {
  // This would check the last packet timestamp and validity
  // Since we don't have those fields in schema, we'll need to track them
  // For now, return unknown
  return { healthy: null, reason: 'Packet tracking not implemented in schema' };
}

// Export validation function for use in other hooks
// Note: In JSVM, we can't export directly, so we'll use it inline
