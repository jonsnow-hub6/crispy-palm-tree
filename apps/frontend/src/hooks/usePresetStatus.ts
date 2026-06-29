import { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import type { LeoRecord } from '@/types/leo.types';

export function usePresetStatus(records: LeoRecord[]) {
  const { presets, activePresetId } = useSelector(
    (state: RootState) => state.presets,
  );

  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId),
    [presets, activePresetId],
  );

  // eslint-disable-next-line react-hooks/purity
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Only run the timer if we actually have an active preset we are waiting to verify
    if (!activePresetId) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [activePresetId]);

  const result = useMemo(() => {
    if (!activePreset || !activePreset.expand?.actions) {
      return {
        isActive: false,
        isMatched: false,
        actions: [],
      };
    }

    const unverifiedActions = activePreset.expand.actions;
    const requiredMatches = unverifiedActions.length;
    let matchedCount = 0;

    // To verify a preset, we find if EACH action has occurred within the
    // last N logs (where N = number_of_actions * 10)
    const windowLength = requiredMatches * 10;
    const thirtySecondsAgo = now - 30_000;

    // Grab the latest records from the buffer up to the window size,
    // and strictly ensure they arrived within the last 30 seconds.
    const recentRecords = records
      .slice(Math.max(0, records.length - windowLength))
      .filter((r) => {
        const arrivalTime = new Date(
          r.timeOfArrival || r.created || '',
        ).getTime();
        return arrivalTime >= thirtySecondsAgo;
      });

    for (const action of unverifiedActions) {
      // Find if this specific projectId + payload combination exists in recent records
      const hasOccurred = recentRecords.some(
        (r) =>
          String(r.projectId).trim() === String(action.project).trim() &&
          String(r.payload).trim() === String(action.payload).trim(),
      );
      if (hasOccurred) {
        matchedCount++;
      }
    }

    return {
      isActive: true,
      isMatched: matchedCount === requiredMatches,
      actions: unverifiedActions,
    };
  }, [activePreset, records, now]);

  return result;
}
