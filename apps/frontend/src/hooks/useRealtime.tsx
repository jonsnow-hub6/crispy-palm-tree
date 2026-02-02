import { useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { store } from '@/store';
import { upsertStation, removeStation } from '@/store/slices/stationsSlice';

type Toast = {
  id: string;
  level: 'info' | 'warning' | 'error' | 'fatal';
  type: 'counter' | 'connection';
  content: string;
  stationName?: string | null;
};

export function useRealtime() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let unsubStations: (() => void) | null = null;
    let unsubNotifications: (() => void) | null = null;
    let counterPresent = false;

    const computeMismatchFromStations = (stations: any[]) => {
      const counters: any[] = [];
      for (const s of stations) {
        let links = s.stationLinks;
        if (typeof links === 'string') {
          try { links = JSON.parse(links); } catch { links = []; }
        }
        for (const l of links) {
          if (l.reachable === false) continue;
          if (l.counter !== undefined && l.counter !== null) counters.push(l.counter);
        }
      }
      const unique = Array.from(new Set(counters));
      return unique.length > 1;
    };

    const ensureCounterToast = (present: boolean) => {
      setToasts((t) => {
        const exists = t.some(x => x.id === 'counter-mismatch');
        if (present && !exists) {
          counterPresent = true;
          const toast: Toast = {
            id: 'counter-mismatch',
            level: 'warning',
            type: 'counter',
            content: 'Counter mismatch detected across stations',
            stationName: null,
          };
          return [toast, ...t].slice(0, 6);
        }
        if (!present && exists) {
          counterPresent = false;
          const next = t.filter(x => x.id !== 'counter-mismatch');
          const okToast: Toast = {
            id: `counter-ok-${Date.now()}`,
            level: 'info',
            type: 'counter',
            content: 'Counters are now consistent',
            stationName: null,
          };
          const updated = [okToast, ...next].slice(0, 6);
          setTimeout(() => setToasts(t2 => t2.filter(x => x.id !== okToast.id)), 3000);
          return updated;
        }
        return t;
      });
    };

    (async () => {
      // initial server check to detect any existing mismatch
      try {
        const records = await pb.collection('stations').getFullList<any>();
        const anyMismatch = computeMismatchFromStations(records as any[]);
        ensureCounterToast(anyMismatch);
      } catch (err) {
        try {
          const state = store.getState();
          const anyMismatch = computeMismatchFromStations(state.stations.stations as any[]);
          ensureCounterToast(anyMismatch);
        } catch (_) {}
      }

      // subscribe stations
      unsubStations = await pb.collection('stations').subscribe('*', (e: any) => {
        try {
          if (e.action === 'delete') {
            const id = e.record?.id || e.recordId;
            if (id) store.dispatch(removeStation(id));
            return;
          }

          if (e.action === 'create' || e.action === 'update') {
            const rec = e.record;
            if (!rec) return;

            let stationLinks = rec.stationLinks;
            if (typeof stationLinks === 'string') {
              try {
                stationLinks = JSON.parse(stationLinks);
              } catch {
                stationLinks = [];
              }
            }

            store.dispatch(
              upsertStation({ ...rec, stationLinks })
            );

            try {
              const state = store.getState();
              const anyMismatch = computeMismatchFromStations(state.stations.stations as any[]);
              ensureCounterToast(anyMismatch);
            } catch (err) {}
          }
        } catch (err) {
          console.error('Realtime stations handler error', err);
        }
      });

      // subscribe notifications
      unsubNotifications = await pb.collection('notifications').subscribe('*', async (e: any) => {
        try {
          if (e.action !== 'create') return;

          const rec = e.record;
          if (!rec) return;

          // If this is a counter-type notification, rely on aggregated counterMismatch state
          if ((rec.type ?? '') === 'counter') {
            return;
          }

          const exists = (prevToasts: Toast[]) => prevToasts.some(t => t.id === rec.id);

          const toast: Toast = {
            id: rec.id,
            level: rec.level ?? 'info',
            type: rec.type ?? 'connection',
            content: rec.content ?? '',
            stationName: null,
          };

          setToasts((t) => exists(t) ? t : [toast, ...t].slice(0, 6));

          if (toast.level !== 'fatal') {
            setTimeout(() => {
              setToasts((t) => t.filter(x => x.id !== toast.id));
            }, 6000);
          }
        } catch (err) {
          console.error('Realtime notifications handler error', err);
        }
      });
    })();

    return () => {
      try { unsubStations?.(); } catch {}
      try { unsubNotifications?.(); } catch {}
    };
  }, []);

  return {
    toasts,
    removeToast: (id: string) =>
      setToasts(t => t.filter(x => x.id !== id)),
  };
}

export default useRealtime;
