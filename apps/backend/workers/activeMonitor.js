/* Active Station Monitor
   - Runs every 3s
   - Finds active station (any link.active === true)
   - Probes active links via /api/getActive
   - Updates link.active in PocketBase if changed
   - Triggers flags for activeness change, total deactivation, or unknown state
*/

const { ensureAdmin, getAllStations, updateStation } = require('./pbClient');
const fetch = global.fetch || require('node-fetch');

const INTERVAL_MS = 3000;

function timeoutFetch(url, opts = {}, ms = 3000) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function probeActive(link) {
  const url = `http://${link.host}:${link.port}/api/getActive`;
  try {
    const res = await timeoutFetch(url, { method: 'GET' }, 2500);
    if (!res.ok) return { ok: false };
    let text = await res.text();
    try { text = JSON.parse(text); } catch (e) {}
    return { ok: true, value: Boolean(text) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function runOnce() {
  try {
    await ensureAdmin();
    const stations = await getAllStations();
    // Find active station (first with any link.active true)
    let activeStation = null;
    for (const st of stations) {
      const linksRaw = st.stationLinks || st.get?.('stationLinks') || '[]';
      let links = [];
      try { links = JSON.parse(linksRaw); } catch (e) { links = []; }
      if (links.some((l) => l.active)) {
        activeStation = { st, links };
        break;
      }
    }

    if (!activeStation) {
      // No active station currently
      return;
    }

    const { st, links } = activeStation;
    // Probe only links that are marked active
    const activeLinksIdx = links.map((l, i) => ({ l, i })).filter(x => x.l.active === true);
    if (activeLinksIdx.length === 0) return;

    const probes = await Promise.all(activeLinksIdx.map(x => probeActive(x.l)));

    let changed = false;
    let anyActive = false;
    let unknownState = false;

    for (let k = 0; k < activeLinksIdx.length; k++) {
      const idx = activeLinksIdx[k].i;
      const old = links[idx];
      const probe = probes[k];
      if (!probe.ok) {
        // could not determine
        unknownState = true;
        continue;
      }
      const val = !!probe.value;
      if (old.active !== val) {
        links[idx] = { ...old, active: val };
        changed = true;
      }
      if (val) anyActive = true;
    }

    const toSave = {
      stationLinks: JSON.stringify(links),
      activeStateUnknown: unknownState,
      activeAt: new Date().toISOString(),
    };

    if (changed) {
      toSave.lastActivenessChange = new Date().toISOString();
    }

    // If we couldn't probe any (unknown) and no definitive info -> mark unknown
    try {
      await updateStation(st.id, toSave);
    } catch (err) {
      console.error('Failed to update active station', st.id, err && err.message ? err.message : err);
    }

    if (changed) {
      console.log(`Activeness change detected for station ${st.id}`);
    }

    if (!anyActive && !unknownState) {
      // All became inactive -> critical
      console.error(`Critical: active station ${st.id} lost all active links`);
      try {
        await updateStation(st.id, { criticalDeactivation: true });
      } catch (e) {}
    }

    if (unknownState) {
      console.error(`Unable to determine activeness for station ${st.id}`);
      try {
        await updateStation(st.id, { activeStateUnknown: true });
      } catch (e) {}
    }

  } catch (err) {
    console.error('Active monitor run error:', err && err.message ? err.message : err);
  }
}

async function start() {
  console.log('Active monitor starting, interval', INTERVAL_MS);
  await runOnce();
  setInterval(runOnce, INTERVAL_MS);
}

start().catch((e) => console.error('Active monitor crash:', e));
