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
    try {
      text = JSON.parse(text);
    } catch {}

    const num = Number(text);
    if (!Number.isFinite(num)) return { ok: false };

    return { ok: true, counter: num };
  } catch {
    return { ok: false };
  }
}

async function probeActive(link) {
  const url = `http://${link.host}:${link.port}/api/getActive`;

  try {
    const res = await timeoutFetch(url, { method: 'GET' }, 3000);
    if (!res.ok) return { ok: false };

    let text = await res.text();
    try {
      text = JSON.parse(text);
    } catch {}

    // Accept: true/false, "true"/"false", 1/0
    const active =
      text === true || text === 'true' || text === 1 || text === '1';

    return { ok: true, active };
  } catch {
    return { ok: false };
  }
}

function mergeLinkFields(existing, counterProbe, activeProbe) {
  return {
    ...existing,

    // Reachable if any probe succeeded
    reachable: !!(counterProbe.ok || activeProbe.ok),

    counter: counterProbe.ok
      ? counterProbe.counter
      : (existing.counter ?? null),

    active: activeProbe.ok ? activeProbe.active : (existing.active ?? false),
  };
}

async function runOnce() {
  const stations = await getAllStations();

  let allCounters = [];
  let counterDecreased = false;

  // identify active station
  const activeStation = stations.find((st) =>
    (Array.isArray(st.stationLinks)
      ? st.stationLinks
      : JSON.parse(st.stationLinks || '[]')
    ).some((l) => l.active === true),
  );

  let isActive = false;

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

    const counterProbes = await Promise.all(links.map(probeCounter));

    const activeProbes = await Promise.all(links.map(probeActive));

    const updatedLinks = links.map((link, i) =>
      mergeLinkFields(link, counterProbes[i], activeProbes[i]),
    );

    // ---- multiple active links → CRITICAL ----
    const activeLinks = updatedLinks.filter((l) => l.active === true);

    if (activeLinks.length === 1 && !activeLinks[0].reachable) {
      await createNotification({
        level: 'critical',
        type: 'connection',
        content: `Station ${st.name} has one active link but it's unreachable`,
      });
    }

    if (activeLinks.length > 1) {
      await createNotification({
        level: 'critical',
        type: 'connection',
        content: `Station ${st.name} has multiple active links (${activeLinks.length})`,
      });
    }

    if (activeLinks.length > 0 && isActive) {
      await createNotification({
        level: 'critical',
        type: 'connection',
        content: `Station ${st.name} has active link while another station is active`,
      });
    }

    isActive = activeLinks.length > 0 || isActive;

    // ---- counter decrease (global) ----
    for (let i = 0; i < links.length; i++) {
      const old = links[i];
      const updated = updatedLinks[i];

      if (old?.active === true && updated?.active === false) {
        await createNotification({
          level: 'error',
          type: 'connection',
          content: `Link ${old.host}:${old.port} became inactive`,
        });
      }

      if (activeStation && st.id === activeStation.id) {
        const anyActive = updatedLinks.some((l) => l.active === true);

        if (!anyActive) {
          await createNotification({
            level: 'critical',
            type: 'connection',
            content: `Active station ${st.name} has no active links`,
          });
        }
      }

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
      const anyReachable = updatedLinks.some((l) => l.reachable);
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

  if (!isActive) {
    await createNotification({
      level: 'critical',
      type: 'connection',
      content: `No active stations detected`,
    });
  }
}

async function start() {
  console.log('Counter monitor starting');
  await runOnce();
  setInterval(runOnce, INTERVAL_MS);
}

start().catch((err) => {
  console.error('Monitor crash:', err);
});
