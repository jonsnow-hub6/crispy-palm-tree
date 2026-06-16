import { useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import type { LeoRecord } from '@/types/leo.types';

type Listener = (batch: LeoRecord[]) => void;

const subscriptionState = {
  unsubscribe: null as (() => void) | null,
  isSubscribing: false,
  listeners: new Set<Listener>(),
  buffer: [] as LeoRecord[],
  flushTimer: null as NodeJS.Timeout | null,
};

const MAX_BATCH = 200;
const FLUSH_INTERVAL = 500; // flush up to ~2x/sec

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
  if (subscriptionState.unsubscribe || subscriptionState.isSubscribing) return;

  subscriptionState.isSubscribing = true;
  try {
    // @ts-ignore - pocketbase types for subscribe are loose here
    const unsub = await pb.collection('leo').subscribe('*', (e: unknown) => {
      try {
        if (!e || typeof e !== 'object') return;
        const evt = e as { action?: string; record?: unknown };
        if (evt.action !== 'create') return;

        const r = evt.record as any;
        if (!r) return;

        // Trim large payloads to avoid unbounded memory growth in the UI.
        const RAW_PAYLOAD = String(r.payload ?? '');
        const MAX_PAYLOAD_STORED = 1024; // keep at most 1KB per record in-memory
        const rec: LeoRecord = {
          id: r.id,
          projectId: String(r.projectId ?? ''),
          counter: Number(r.counter ?? 0),
          magic: Number(r.magic ?? 0),
          payload:
            RAW_PAYLOAD.length > MAX_PAYLOAD_STORED
              ? RAW_PAYLOAD.slice(0, MAX_PAYLOAD_STORED)
              : RAW_PAYLOAD,
          reserved: String(r.reserved ?? ''),
          messageType: Number(r.messageType ?? 0),
          management: Number(r.management ?? 0),
          threshold: Number(r.threshold ?? 0),
          timeOfArrival: String(r.timeOfArrival ?? ''),
          decoderId: String(r.decoderId ?? ''),
          created: r.created,
          isCounterCorrect: r.isCounterCorrect !== undefined ? r.isCounterCorrect : null,
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

    // If all listeners were removed while we were awaiting the subscription
    if (subscriptionState.listeners.size === 0) {
      unsub();
      subscriptionState.unsubscribe = null;
    } else {
      subscriptionState.unsubscribe = unsub;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to subscribe to leo', err);
  } finally {
    subscriptionState.isSubscribing = false;
  }
}

export function useLeoRealtime(onRecords: (batch: LeoRecord[]) => void) {
  useEffect(() => {
    subscriptionState.listeners.add(onRecords);

    void ensureSubscription();

    return () => {
      subscriptionState.listeners.delete(onRecords);
      if (subscriptionState.listeners.size === 0) {
        try {
          pb.collection('leo').unsubscribe('*');
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to unsubscribe leo', err);
        }
        subscriptionState.unsubscribe = null;
        subscriptionState.isSubscribing = false;
      }
    };
  }, [onRecords]);
}

export default useLeoRealtime;
