import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import useLeoRealtime from '@/hooks/useLeoRealtime';
import type { LeoRecord } from '@/types/leo.types';

const SOFT_CAP = 200; // keep only most recent 200 records globally

interface LeoContextType {
  records: LeoRecord[];
  clearRecords: () => void;
}

const LeoContext = createContext<LeoContextType | undefined>(undefined);

export function LeoProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<LeoRecord[]>([]);
  // We don't fetch history globally, just listen to the live tail
  // since Preset validation is meant to only check recent live logs.

  const appendRecords = useCallback((batch: LeoRecord[]) => {
    setRecords((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const newBatch = batch.filter((f) => f.id && !existingIds.has(f.id));
      if (!newBatch.length) return prev;

      const merged = prev.concat(newBatch);
      if (merged.length > SOFT_CAP)
        return merged.slice(merged.length - SOFT_CAP);
      return merged;
    });
  }, []);

  useLeoRealtime(appendRecords);

  const clearRecords = useCallback(() => {
    setRecords([]);
  }, []);

  return (
    <LeoContext.Provider value={{ records, clearRecords }}>
      {children}
    </LeoContext.Provider>
  );
}

export function useLeoContext() {
  const context = useContext(LeoContext);
  if (context === undefined) {
    throw new Error('useLeoContext must be used within a LeoProvider');
  }
  return context;
}
