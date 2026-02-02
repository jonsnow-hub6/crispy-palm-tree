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
      let body = res.body;
      try { body = JSON.parse(res.body); } catch (e) {}
      return { ok: true, value: Boolean(body) };
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
      let body = res.body;
      try { body = JSON.parse(res.body); } catch (e) {}
      const num = Number(body);
      return { ok: true, value: Number.isFinite(num) ? num : null };
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
    const res = $http.send({ url: url, method: 'GET', timeout: 3000 });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      let body = res.body;
      try { body = JSON.parse(res.body); } catch (e) {}
      return { ok: true, value: body };
    }
    return { ok: false, error: `status ${res.statusCode}` };
  } catch (err) {
    return { ok: false, error: `error in http request to api: ${String(err)}` };
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

module.exports = {
  httpPostSetActive,
  httpGetActive,
  httpGetCounter,
  activateLink,
  deactivateLink,
  probeLink,
  httpPostSetPreset,
  httpGetPreset,
};