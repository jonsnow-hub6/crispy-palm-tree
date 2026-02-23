/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/api/cron/probe-all', async (c) => {
	const notifications = $app.findCollectionByNameOrId('notifications');

	try {
		const { httpGetCounter, probeLink, httpGetPreset } = require(`${__hooks}/api.utils`);

		const stations = $app.findRecordsByFilter('stations', '');

		let allCounters = [];
		let counterDecreased = false;

		// identify active station (DB records)
		const activeStation = stations.find((st) => {
			const links = JSON.parse(st.get('stationLinks') || '[]');
			return links.some((l) => l.active === true);
		});

		let isActive = false;

		for (const st of stations) {
			let links = [];
			try {
				links = JSON.parse(st.get('stationLinks') || '[]');
			} catch {
				links = [];
			}

			// Normalize link fields (ensure boolean `active`)
			links = links.map((l) => ({
				...l,
				active:
					l.active === true ||
					l.active === 'true' ||
					l.active === 1 ||
					l.active === '1'
						? true
						: false,
			}));

			// run probes in parallel
			const counterProbes = await Promise.all(links.map((l) => httpGetCounter(l)));
			const activeProbes = await Promise.all(links.map((l) => probeLink(l)));

			// deep copy
			const updatedLinks = JSON.parse(JSON.stringify(links));

			for (let i = 0; i < links.length; i++) {
				const existing = links[i];
				const counterProbe = counterProbes[i] || { ok: false };
				const activeProbe = activeProbes[i] || { ok: false, reachable: false };

				updatedLinks[i] = {
					...existing,
					reachable: !!(counterProbe.ok || activeProbe.reachable),
					counter: counterProbe.ok ? counterProbe.value : (existing.counter ?? null),
					// If the probe explicitly reports active, mark active.
					// If the probe was reachable but reports not active, reflect that (set false).
					// Only keep previous `existing.active` when the probe did not reach the device at all.
					active: activeProbe.ok
						? true
						: activeProbe.reachable
						? false
						: (existing.active === true),
				};

				// sample current preset from device (like checkPresets)
				try {
					const presetRes = await httpGetPreset(existing);
					if (presetRes.ok && presetRes.value) {
						updatedLinks[i].currentPreset = presetRes.value.presetName || 'unknown';
						// mark reachable if preset responded
						updatedLinks[i].reachable = true;
					} else {
						let notification = new Record(notifications);
						notification.set('level', 'error');
						notification.set('type', 'connection');
						notification.set('content', `Failed to get preset from station "${st.get('name')}" (${existing.host}:${existing.port}) - ${presetRes.error}`);
						$app.save(notification);

						// don't clear `reachable` here; rely on counter/active probes
						updatedLinks[i].currentPreset = 'unknown';
					}
				} catch (e) {
					let notification = new Record(notifications);
					notification.set('level', 'error');
					notification.set('type', 'connection');
					notification.set('content', `Error fetching preset from ${existing.host}:${existing.port} - ${String(e)}`);
					$app.save(notification);
					updatedLinks[i].currentPreset = 'unknown';
				}
			}

			// ---- multiple active links → CRITICAL ----
			const activeLinks = updatedLinks.filter((l) => l.active === true);

			if (activeLinks.length === 1 && !activeLinks[0].reachable) {
				let notification = new Record(notifications);
				notification.set('level', 'critical');
				notification.set('type', 'connection');
				notification.set('content', `Station ${st.get('name')} has one active link but it's unreachable`);
				$app.save(notification);
			}

			if (activeLinks.length > 1) {
				let notification = new Record(notifications);
				notification.set('level', 'critical');
				notification.set('type', 'connection');
				notification.set('content', `Station ${st.get('name')} has multiple active links (${activeLinks.length})`);
				$app.save(notification);
			}

			if (activeLinks.length > 0 && isActive) {
				let notification = new Record(notifications);
				notification.set('level', 'critical');
				notification.set('type', 'connection');
				notification.set('content', `Station ${st.get('name')} has active link while another station is active`);
				$app.save(notification);
			}

			isActive = activeLinks.length > 0 || isActive;

			// ---- counter decrease (global) & per-link notifications ----
			for (let i = 0; i < links.length; i++) {
				const old = links[i];
				const updated = updatedLinks[i];

				if (old?.active === true && updated?.active === false) {
					let notification = new Record(notifications);
					notification.set('level', 'error');
					notification.set('type', 'connection');
					notification.set('content', `Link ${old.host}:${old.port} became inactive`);
					$app.save(notification);
				}

				if (activeStation && st.id === activeStation.id) {
					const anyActive = updatedLinks.some((l) => l.active === true);
					if (!anyActive) {
						let notification = new Record(notifications);
						notification.set('level', 'critical');
						notification.set('type', 'connection');
						notification.set('content', `Active station ${st.get('name')} has no active links`);
						$app.save(notification);
					}
				}

				if (typeof old?.counter === 'number' && typeof updated?.counter === 'number') {
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
					let notification = new Record(notifications);
					notification.set('level', 'critical');
					notification.set('type', 'connection');
					notification.set('content', `Active station ${activeStation.get('name')} is unreachable`);
					$app.save(notification);
				}
			}

			// ---- persist links (always) ----
			st.set('stationLinks', JSON.stringify(updatedLinks));
			$app.save(st);
		}

		// ---- global counter decrease ----
		if (counterDecreased) {
			let notification = new Record(notifications);
			notification.set('level', 'error');
			notification.set('type', 'counter');
			notification.set('content', 'Counter decreased on at least one link');
			$app.save(notification);
		}

		// ---- global counter consistency ----
		const uniqueCounters = Array.from(new Set(allCounters));
		if (uniqueCounters.length > 1) {
			let notification = new Record(notifications);
			notification.set('level', 'warning');
			notification.set('type', 'counter');
			notification.set('content', `Global counter mismatch detected: ${uniqueCounters.join(', ')}`);
			$app.save(notification);
		}

		if (!isActive) {
			let notification = new Record(notifications);
			notification.set('level', 'critical');
			notification.set('type', 'connection');
			notification.set('content', `No active stations detected`);
			$app.save(notification);
		}

		return c.json(200, { success: true });
	} catch (err) {
		let notification = new Record($app.findCollectionByNameOrId('notifications'));
		notification.set('level', 'error');
		notification.set('content', `Error during probe-all cron: ${String(err)}`);
		$app.save(notification);
		console.error(err?.stack || err);
		return c.json(500, { error: String(err) });
	}
});
