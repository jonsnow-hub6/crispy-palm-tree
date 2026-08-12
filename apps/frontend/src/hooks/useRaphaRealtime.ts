import { useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import type { RaphaRecord, RaphaPllLockState } from '@/types/rapha';
import { store } from '@/store';
import {
  addPllPoints,
  addSnrPoints,
  addCarrierPhasePoints,
  trimToLast60s,
} from '@/store/slices/raphaSlice';

type Point = { ts: number; value: number; decoderId?: string };

const subscriptionState = {
  unsubscribe: null as (() => void) | null,
  pllBuffer: [] as Point[],
  snrBuffer: [] as Point[],
  carrierPhaseBuffer: [] as Point[],
  flushTimer: null as NodeJS.Timeout | null,
  cleanupTimer: null as NodeJS.Timeout | null,
};

// Reduce batch size and flush frequency to lower memory / render pressure
const MAX_BATCH = 200;
const FLUSH_INTERVAL = 1000; // 1 updates per second

function scheduleFlush() {
  if (subscriptionState.flushTimer) return;

  subscriptionState.flushTimer = setTimeout(() => {
    subscriptionState.flushTimer = null;

    if (subscriptionState.pllBuffer.length) {
      store.dispatch(addPllPoints(subscriptionState.pllBuffer));
      subscriptionState.pllBuffer.length = 0;
    }

    if (subscriptionState.snrBuffer.length) {
      store.dispatch(addSnrPoints(subscriptionState.snrBuffer));
      subscriptionState.snrBuffer.length = 0;
    }

    if (subscriptionState.carrierPhaseBuffer.length) {
      store.dispatch(
        addCarrierPhasePoints(subscriptionState.carrierPhaseBuffer),
      );
      subscriptionState.carrierPhaseBuffer.length = 0;
    }
  }, FLUSH_INTERVAL);
}

async function loadInitialData() {
  try {
    const since = new Date(Date.now() - 60_000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19);
    // PLL data
    const pll = await pb.collection('rapha').getFullList({
      filter: `name="pllLockState" && created >= "${since}"`,
      sort: 'created',
      $autoCancel: false,
    });

    const pllPoints = pll
      .map((r: any) => {
        const v = r.parameters?.pllLockState;
        if (v === 0 || v === 1) {
          return {
            ts: new Date(r.created).getTime(),
            value: v,
            decoderId: (r as any).decoderId ?? undefined,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (pllPoints.length) {
      store.dispatch(addPllPoints(pllPoints as Point[]));
    }

    // Carrier Phase data
    const carrier = await pb.collection('rapha').getFullList({
      filter: `name="carrierPhase" && created >= "${since}"`,
      sort: 'created',
      $autoCancel: false,
    });

    const carrierPoints = carrier
      .map((r: any) => {
        const v = r.parameters?.carrierPhase;
        if (
          v !== null &&
          v !== undefined &&
          typeof v === 'number' &&
          Number.isFinite(v)
        ) {
          return {
            ts: new Date(r.created).getTime(),
            value: v,
            decoderId: (r as any).decoderId ?? undefined,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (carrierPoints.length) {
      store.dispatch(addCarrierPhasePoints(carrierPoints as Point[]));
    }

    // SNR data
    const snr = await pb.collection('rapha').getFullList({
      filter: `name="snr" && created >= "${since}"`,
      sort: 'created',
      $autoCancel: false,
    });

    const snrPoints = snr
      .map((r: any) => {
        const v = r.parameters?.snr;
        if (typeof v === 'number' && Number.isFinite(v)) {
          return {
            ts: new Date(r.created).getTime(),
            value: v,
            decoderId: (r as any).decoderId ?? undefined,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (snrPoints.length) {
      store.dispatch(addSnrPoints(snrPoints as Point[]));
    }
  } catch {}
}

async function ensureSubscription() {
  if (subscriptionState.unsubscribe) return;

  try {
    // @ts-ignore
    subscriptionState.unsubscribe = await pb
      .collection('rapha')
      .subscribe('*', (e: unknown) => {
        try {
          if (!e || typeof e !== 'object') return;
          const evt = e as { action?: string; record?: unknown };
          if (evt.action !== 'create') return;

          const rec = evt.record as RaphaRecord | undefined;
          if (!rec) return;

          const ts = Date.now();

          if (rec.name === 'pllLockState') {
            const v = (rec as RaphaPllLockState).parameters?.pllLockState;
            const dec = (rec as any).decoderId ?? undefined;

            if (v === 0 || v === 1) {
              subscriptionState.pllBuffer.push({
                ts,
                value: v,
                decoderId: dec,
              });

              if (subscriptionState.pllBuffer.length > MAX_BATCH) {
                subscriptionState.pllBuffer.splice(
                  0,
                  subscriptionState.pllBuffer.length - MAX_BATCH,
                );
              }

              scheduleFlush();
            }

            return;
          }

          if (rec.name === 'carrierPhase') {
            const v = (rec as any).parameters?.carrierPhase;
            const dec = (rec as any).decoderId ?? undefined;

            if (
              v !== null &&
              v !== undefined &&
              typeof v === 'number' &&
              Number.isFinite(v)
            ) {
              subscriptionState.carrierPhaseBuffer.push({
                ts,
                value: v,
                decoderId: dec,
              });

              if (subscriptionState.carrierPhaseBuffer.length > MAX_BATCH) {
                subscriptionState.carrierPhaseBuffer.splice(
                  0,
                  subscriptionState.carrierPhaseBuffer.length - MAX_BATCH,
                );
              }

              scheduleFlush();
            }

            return;
          }

          if (rec.name === 'snr') {
            const v = (rec as any).parameters?.snr;
            const dec = (rec as any).decoderId ?? undefined;

            if (typeof v === 'number' && Number.isFinite(v)) {
              subscriptionState.snrBuffer.push({
                ts,
                value: v,
                decoderId: dec,
              });

              if (subscriptionState.snrBuffer.length > MAX_BATCH) {
                subscriptionState.snrBuffer.splice(
                  0,
                  subscriptionState.snrBuffer.length - MAX_BATCH,
                );
              }

              scheduleFlush();
            }

            return;
          }
        } catch (err) {
          console.error('rapha realtime handler', err);
        }
      });

    // subscription established
    // start periodic cleanup to ensure redux only keeps last 60s
    if (!subscriptionState.cleanupTimer) {
      subscriptionState.cleanupTimer = setInterval(() => {
        try {
          store.dispatch(trimToLast60s());
        } catch (err) {
          console.error('rapha cleanup error', err);
        }
      }, 1000);
    }
  } catch (err) {
    console.error('Failed to subscribe to rapha', err);
  }
}

export function useRaphaRealtime() {
  useEffect(() => {
    async function start() {
      if (
        store.getState().rapha.pllPoints.length === 0 &&
        store.getState().rapha.snrPoints.length === 0 &&
        store.getState().rapha.carrierPhasePoints.length === 0
      ) {
        await loadInitialData(); // 👈 load last minute
      }
      await ensureSubscription(); // 👈 start realtime
    }

    void start();
    return () => {
      if (subscriptionState.unsubscribe) {
        try {
          subscriptionState.unsubscribe();
        } catch (err) {
          console.error('Failed to unsubscribe rapha on unmount', err);
        }
        subscriptionState.unsubscribe = null;
      }
      if (subscriptionState.cleanupTimer) {
        clearInterval(subscriptionState.cleanupTimer);
        subscriptionState.cleanupTimer = null;
      }
    };
  }, []);

  return {} as const;
}

export default useRaphaRealtime;
