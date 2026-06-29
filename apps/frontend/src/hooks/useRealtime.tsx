import { useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { store } from '@/store';
import { upsertStation, removeStation } from '@/store/slices/stationsSlice';
import { useRef, useCallback } from 'react';

type Toast = {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  type: 'counter' | 'connection';
  content: string;
  stationName?: string | null;
  timestamp?: number;
};

export function useRealtime() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<Toast[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const okShownRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let unsubStations: (() => void) | null = null;
    let unsubNotifications: (() => void) | null = null;

    const computeMismatchFromStations = (stations: any[]) => {
      const counters: any[] = [];
      for (const s of stations) {
        let links = s.stationLinks;
        if (typeof links === 'string') {
          try {
            links = JSON.parse(links);
          } catch {
            links = [];
          }
        }
        for (const l of links) {
          if (l.reachable === false) continue;
          if (l.counter !== undefined && l.counter !== null)
            counters.push(l.counter);
        }
      }
      const unique = Array.from(new Set(counters));
      return unique.length > 1;
    };

    const ensureCounterToast = (present: boolean) => {
      setToasts((t) => {
        // --------------------
        // MISMATCH PRESENT
        // --------------------
        if (present) {
          okShownRef.current = false; // reset OK flag

          // show warning if not exists
          // if (!hasMismatchToast) {
          //   const toast: Toast = {
          //     id: 'counter-mismatch',
          //     level: 'warning',
          //     type: 'counter',
          //     content: 'Counter mismatch detected across stations',
          //     stationName: null,
          //     timestamp: Date.now(),
          //   };

          //   setHistory((h) => [toast, ...h].slice(0, 20));
          //   setUnreadCount((c) => c + 1);

          //   return [toast, ...t].slice(0, 6);
          // }

          return t;
        }

        // --------------------
        // NOW CONSISTENT
        // --------------------
        // if (!present) {
        //   // remove mismatch toast
        //   const next = t.filter((x) => x.id !== 'counter-mismatch');

        //   // already showed OK → do nothing
        //   if (okShownRef.current) {
        //     return next;
        //   }

        //   okShownRef.current = true;

        //   const okToast: Toast = {
        //     id: `counter-ok-${Date.now()}`,
        //     level: 'info',
        //     type: 'counter',
        //     content: 'Counters are now consistent',
        //     stationName: null,
        //     timestamp: Date.now(),
        //   };

        //   setHistory((h) => [okToast, ...h].slice(0, 20));
        //   setUnreadCount((c) => c + 1);

        //   setTimeout(() => {
        //     setToasts((t2) => t2.filter((x) => x.id !== okToast.id));
        //   }, 3000);

        //   return [okToast, ...next].slice(0, 6);
        // }

        return t;
      });
    };

    (async () => {
      // initial server check to detect any existing mismatch
      try {
        const records = await pb.collection('stations').getFullList<any>();
        const anyMismatch = computeMismatchFromStations(records as any[]);
        ensureCounterToast(anyMismatch);
      } catch {
        try {
          const state = store.getState();
          const anyMismatch = computeMismatchFromStations(
            state.stations.stations as any[],
          );
          ensureCounterToast(anyMismatch);
        } catch {}
      }

      // subscribe stations
      unsubStations = await pb
        .collection('stations')
        .subscribe('*', (e: any) => {
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

              store.dispatch(upsertStation({ ...rec, stationLinks }));

              try {
                const state = store.getState();
                const anyMismatch = computeMismatchFromStations(
                  state.stations.stations as any[],
                );
                ensureCounterToast(anyMismatch);
              } catch {}
            }
          } catch (err) {
            console.error('Realtime stations handler error', err);
          }
        });

      // subscribe notifications
      unsubNotifications = await pb
        .collection('notifications')
        .subscribe('*', async (e: any) => {
          try {
            if (e.action !== 'create') return;

            const rec = e.record;
            if (!rec) return;

            // Prevent duplicate processing from double-subscriptions in React Strict Mode
            if (seenIdsRef.current.has(rec.id)) return;
            seenIdsRef.current.add(rec.id);

            // If this is a counter-type notification, rely on aggregated counterMismatch state
            // if ((rec.type ?? '') === 'counter') {
            //   return;
            // }

            const toast: Toast = {
              id: rec.id,
              level: rec.level ?? 'info',
              type: rec.type ?? 'connection',
              content: rec.content ?? '',
              stationName: rec.stationName ?? null,
              timestamp: Date.now(),
            };

            setToasts((t) => [toast, ...t].slice(0, 6));
            setHistory((h) => [toast, ...h].slice(0, 20));
            setUnreadCount((c) => c + 1);

            if (toast.level !== 'critical') {
              setTimeout(() => {
                setToasts((t) => t.filter((x) => x.id !== toast.id));
              }, 6000);
            }
          } catch (err) {
            console.error('Realtime notifications handler error', err);
          }
        });
    })();

    return () => {
      try {
        unsubStations?.();
      } catch {}
      try {
        unsubNotifications?.();
      } catch {}
    };
  }, []);

  return {
    toasts,
    history,
    unreadCount,
    markAllRead: useCallback(() => setUnreadCount(0), []),
    removeToast: (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
  };
}

export default useRealtime;
