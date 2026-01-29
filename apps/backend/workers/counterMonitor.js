/* Counter Monitor Worker
   - Runs every 5s
   - Fetches all stations, probes each link /api/getCounter
   - Updates link.counter, link.reachable, station.counterMismatch, station.unreachable
   - Ensures counters never decrease; sets flags when they do
*/

const { ensureAdmin, getAllStations, updateStation } = require('./pbClient');
const fetch = global.fetch || require('node-fetch');

const INTERVAL_MS = 5000;

function timeoutFetch(url, opts = {}, ms = 3000) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function probeCounter(link) {
  const url = `http://${link.host}:${link.port}/api/getCounter`;
  try {
    const res = await timeoutFetch(url, { method: 'GET' }, 3000);
    if (!res.ok) return { ok: false };
    let text = await res.text();
    try { text = JSON.parse(text); } catch (e) {}
    const num = Number(text);
    if (!Number.isFinite(num)) return { ok: false };
    return { ok: true, counter: num };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function mergeLinkFields(existing, probe) {
  return {
    ...existing,
    reachable: !!probe.ok,
    counter: probe.ok ? probe.counter : existing.counter ?? null,
  };
}

async function runOnce() {
  try {
    await ensureAdmin();
    const stations = await getAllStations();
    for (const st of stations) {
      const linksRaw = st.stationLinks || st.get?.('stationLinks') || '[]';
      let links = [];
      try { links = JSON.parse(linksRaw); } catch (e) { links = []; }

      const probes = await Promise.all(links.map((l) => probeCounter(l)));
      let anyReachable = false;
      let counters = [];
      const updatedLinks = links.map((link, i) => {
        const probe = probes[i];
        const merged = mergeLinkFields(link, probe);
        if (merged.reachable) {
          anyReachable = true;
          if (typeof merged.counter === 'number') counters.push(merged.counter);
        }
        return merged;
      });

      // Check counter monotonicity per-link using stored value
      let counterDecrease = false;
      for (let i = 0; i < links.length; i++) {
        const old = links[i];
        const updated = updatedLinks[i];
        if (updated.counter != null && old && typeof old.counter === 'number') {
          if (updated.counter < old.counter) counterDecrease = true;
        }
      }

      // consistency across reachable links
      const uniqueCounters = Array.from(new Set(counters));
      const countersConsistent = uniqueCounters.length <= 1;

      const toSave = {
        stationLinks: JSON.stringify(updatedLinks),
        counterMismatch: !countersConsistent,
        unreachable: !anyReachable,
        counterDecrease: counterDecrease,
        updatedAt: new Date().toISOString(),
      };

      try {
        await updateStation(st.id, toSave);
      } catch (err) {
        console.error('Failed to update station', st.id, err && err.message ? err.message : err);
      }

      // If inconsistent or decrease, also log for visibility
      if (!countersConsistent) {
        console.warn(`Station ${st.id} counter mismatch:`, uniqueCounters);
      }
      if (counterDecrease) {
        console.error(`Station ${st.id} counter decreased on one or more links`);
      }
    }
  } catch (err) {
    console.error('Counter monitor run error:', err && err.message ? err.message : err);
  }
}

async function start() {
  console.log('Counter monitor starting, interval', INTERVAL_MS);
  // Run immediately then schedule
  await runOnce();
  setInterval(runOnce, INTERVAL_MS);
}

start().catch((e) => console.error('Monitor crash:', e));
