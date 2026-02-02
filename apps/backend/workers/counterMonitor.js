const {
  getAllStations,
  updateStation,
  createNotification,
} = require('./pbClient');

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
    try { text = JSON.parse(text); } catch {}

    const num = Number(text);
    if (!Number.isFinite(num)) return { ok: false };

    return { ok: true, counter: num };
  } catch {
    return { ok: false };
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
  const stations = await getAllStations();

  let allCounters = [];
  let counterDecreased = false;

  // identify active station
  const activeStation = stations.find(st =>
    (Array.isArray(st.stationLinks)
      ? st.stationLinks
      : JSON.parse(st.stationLinks || '[]')
    ).some(l => l.active === true)
  );

  for (const st of stations) {
    let links = [];

    if (Array.isArray(st.stationLinks)) {
      links = st.stationLinks;
    } else {
      try {
        links = JSON.parse(st.stationLinks || '[]');
      } catch {
        links = [];
      }
    }

    const probes = await Promise.all(links.map(probeCounter));

    const updatedLinks = links.map((link, i) =>
      mergeLinkFields(link, probes[i])
    );

    // ---- counter decrease (global) ----
    for (let i = 0; i < links.length; i++) {
      const old = links[i];
      const updated = updatedLinks[i];

      if (
        typeof old?.counter === 'number' &&
        typeof updated?.counter === 'number'
      ) {
        if (updated.counter < old.counter) {
          counterDecreased = true;
        }
        allCounters.push(updated.counter);
      }
    }

    // ---- active station unreachable → ERROR ----
    if (activeStation && st.id === activeStation.id) {
      const anyReachable = updatedLinks.some(l => l.reachable);
      if (!anyReachable) {
        await createNotification({
          level: 'critical',
          type: 'connection',
          content: `Active station ${activeStation.name} is unreachable`,
        });
      }
    }

    // ---- persist links (always) ----
    await updateStation(st.id, {
      stationLinks: JSON.stringify(updatedLinks),
    });
  }

  // ---- global counter decrease ----
  if (counterDecreased) {
    await createNotification({
      level: 'error',
      type: 'counter',
      content: 'Counter decreased on at least one link',
    });
  }

  // ---- global counter consistency ----
  const uniqueCounters = Array.from(new Set(allCounters));
  if (uniqueCounters.length > 1) {
    await createNotification({
      level: 'warning',
      type: 'counter',
      content: `Global counter mismatch detected: ${uniqueCounters.join(', ')}`,
    });
  }
}

async function start() {
  console.log('Counter monitor starting');
  await runOnce();
  setInterval(runOnce, INTERVAL_MS);
}

start().catch(err => {
  console.error('Monitor crash:', err);
});
