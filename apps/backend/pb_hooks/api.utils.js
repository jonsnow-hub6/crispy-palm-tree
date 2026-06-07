/// <reference path="../pb_data/types.d.ts" />

// Helper HTTP wrappers (synchronous $http.send)
function httpPostSetActive(link, active) {
  const url = `http://${link.host}:${link.port}/api/setActive`;
  try {
    const res = $http.send({
      url: url,
      method: 'POST',
      body: JSON.stringify({ active }),
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000,
    });
    return { ok: res.statusCode >= 200 && res.statusCode < 300, res };
  } catch (err) {
    return { ok: false, error: `error in http request to api: ${String(err)}` };
  }
}

function httpGetActive(link) {
  const url = `http://${link.host}:${link.port}/api/getActive`;
  try {
    const res = $http.send({ url: url, method: 'GET', timeout: 3000 });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Expect boolean in body (raw)
      // support either res.json (already parsed) or res.body
      let body = res.json !== undefined ? res.json : res.body;
      try {
        if (typeof body === 'string') body = JSON.parse(body);
      } catch (e) {}

      // If response is an object, try common keys
      if (body && typeof body === 'object') {
        if (typeof body.active !== 'undefined') body = body.active;
        else if (typeof body.value !== 'undefined') body = body.value;
        else if (typeof body.ok !== 'undefined') body = body.ok;
      }

      // Normalize boolean-like responses: true/'true'/1/'1' => true
      const value =
        body === true || body === 'true' || body === 1 || body === '1';

      return { ok: true, value };
    }
    return { ok: false, error: `status ${res.statusCode}` };
  } catch (err) {
    return { ok: false, error: `error in http request to api: ${String(err)}` };
  }
}

function httpGetCounter(link) {
  const url = `http://${link.host}:${link.port}/api/getCounter`;
  try {
    const res = $http.send({ url: url, method: 'GET', timeout: 3000 });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // support either res.json (already parsed) or res.body
      let body = res.json !== undefined ? res.json : res.body;
      try {
        if (typeof body === 'string') body = JSON.parse(body);
      } catch (e) {}

      // If response is an object, try common keys
      if (body && typeof body === 'object') {
        if (typeof body.counter !== 'undefined') body = body.counter;
        else if (typeof body.value !== 'undefined') body = body.value;
      }

      // Coerce to number
      const num = Number(body);
      if (!Number.isFinite(num)) {
        return { ok: false, error: 'invalid counter' };
      }
      return { ok: true, value: num };
    }
    return { ok: false, error: `status ${res.statusCode}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function httpPostSetPreset(link, preset) {
  const url = `http://${link.host}:${link.port}/api/setPreset`;
  try {
    const res = $http.send({
      url: url,
      method: 'POST',
      body: JSON.stringify(preset),
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    return { ok: res.statusCode >= 200 && res.statusCode < 300, res };
  } catch (err) {
    return { ok: false, error: `error in http request to api: ${String(err)}` };
  }
}

function httpGetPreset(link) {
  const url = `http://${link.host}:${link.port}/api/getPreset`;
  try {
    const res = $http.send({
      url,
      method: 'GET',
      timeout: 3000,
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      let body = res.json;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          return {
            ok: false,
            error: 'Invalid JSON response',
          };
        }
      }
      return {
        ok: true,
        value: body,
      };
    }
    return {
      ok: false,
      error: `status ${res.statusCode}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: `error in http request to api: ${String(err)}`,
    };
  }
}

function activateLink(link) {
  return new Promise((resolve) => {
    const res = httpPostSetActive(link, true);
    if (!res.ok) return resolve({ ok: false, link, error: res.error });

    const verify = httpGetActive(link);
    resolve({
      ok: verify.ok && verify.value === true,
      link,
      error: verify.error,
    });
  });
}

function deactivateLink(link) {
  return new Promise((resolve) => {
    const res = httpPostSetActive(link, false);
    resolve({ ok: res.ok, link });
  });
}

function probeLink(link) {
  return new Promise((resolve) => {
    const res = httpGetActive(link);
    resolve({
      ok: res.ok && res.value === true,
      reachable: res.ok,
      link,
    });
  });
}

// relevantStation optional argument:
//   { record, link }  – record is a PocketBase Record; link is { host, port } (optional)
// OR
//   { name, id, link } – plain strings when no record is available
function getSystemMetadata(relevantStation) {
  let currentPreset = '';
  try {
    const activePresets = $app.findRecordsByFilter('presets', 'active = true');
    if (activePresets.length > 0) {
      currentPreset = activePresets[0].get('name');
    }
  } catch (e) {
    console.error('Error fetching active preset:', e);
  }

  let activeLink = '';
  let station = '';
  let stationId = '';

  try {
    const stations = $app.findRecordsByFilter('stations', '');
    for (const st of stations) {
      const links = JSON.parse(st.get('stationLinks') || '[]');
      const active = links.find((l) => l.active === true);
      if (active) {
        activeLink = `${active.host}:${active.port}`;
        stationId = st.id;
        station = st.get('name');
        break;
      }
    }
  } catch (e) {
    console.error('Error finding active station:', e);
  }

  const activeStationMeta = station
    ? {
        name: station,
        id: stationId,
        link: activeLink,
      }
    : null;

  // Build relevantStation metadata
  let relevantStationMeta = null;
  if (relevantStation) {
    const rec = relevantStation.record || null;
    const lnk = relevantStation.link || null;
    relevantStationMeta = {
      name: rec ? rec.get('name') : relevantStation.name || '',
      id: rec ? rec.id : relevantStation.id || '',
      link: lnk ? `${lnk.host}:${lnk.port}` : relevantStation.linkStr || '',
    };
  }

  return {
    currentPreset,
    activeStation: activeStationMeta,
    relevantStation: relevantStationMeta,
  };
}

module.exports = {
  httpPostSetActive,
  httpGetActive,
  httpGetCounter,
  activateLink,
  deactivateLink,
  probeLink,
  httpPostSetPreset,
  httpGetPreset,
  getSystemMetadata,
};
