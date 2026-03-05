import { useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import type { LeoRecord } from '@/types/leo.types';

type Listener = (batch: LeoRecord[]) => void;

const subscriptionState = {
  unsubscribe: null as (() => void) | null,
  listeners: new Set<Listener>(),
  buffer: [] as LeoRecord[],
  flushTimer: null as NodeJS.Timeout | null,
};

const MAX_BATCH = 500;
const FLUSH_INTERVAL = 300; // flush up to ~3x/sec

function scheduleFlush() {
  if (subscriptionState.flushTimer) return;

  subscriptionState.flushTimer = setTimeout(() => {
    subscriptionState.flushTimer = null;
    if (subscriptionState.buffer.length === 0) return;

    const batch = subscriptionState.buffer.splice(0, subscriptionState.buffer.length);
    for (const l of subscriptionState.listeners) {
      try {
        l(batch);
      } catch (err) {
        // listener errors should not break the pipeline
        // eslint-disable-next-line no-console
        console.error('leo listener error', err);
      }
    }
  }, FLUSH_INTERVAL);
}

async function ensureSubscription() {
  if (subscriptionState.unsubscribe) return;

  try {
    // @ts-ignore - pocketbase types for subscribe are loose here
    subscriptionState.unsubscribe = await pb.collection('leo').subscribe('*', (e: unknown) => {
      try {
        if (!e || typeof e !== 'object') return;
        const evt = e as { action?: string; record?: unknown };
        if (evt.action !== 'create') return;

        const r = evt.record as any;
        if (!r) return;

        const rec: LeoRecord = {
          id: r.id,
          projectId: String(r.projectId ?? ''),
          counter: Number(r.counter ?? 0),
          magic: Number(r.magic ?? 0),
          payload: String(r.payload ?? ''),
          timeOfArrival: String(r.timeOfArrival ?? ''),
          decoderId: String(r.decoderId ?? ''),
          created: r.created,
        };

        subscriptionState.buffer.push(rec);
        if (subscriptionState.buffer.length > MAX_BATCH) {
          subscriptionState.buffer.splice(0, subscriptionState.buffer.length - MAX_BATCH);
        }
        scheduleFlush();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('leo realtime handler', err);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to subscribe to leo', err);
  }
}

export function useLeoRealtime(onRecords: (batch: LeoRecord[]) => void) {
  useEffect(() => {
    subscriptionState.listeners.add(onRecords);

    void ensureSubscription();

    return () => {
      subscriptionState.listeners.delete(onRecords);
      if (subscriptionState.listeners.size === 0 && subscriptionState.unsubscribe) {
        try {
          subscriptionState.unsubscribe();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to unsubscribe leo', err);
        }
        subscriptionState.unsubscribe = null;
      }
    };
  }, [onRecords]);
}

export default useLeoRealtime;
