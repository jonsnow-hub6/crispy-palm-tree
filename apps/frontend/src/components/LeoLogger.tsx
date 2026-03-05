import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeoRecord } from '@/types/leo.types';
import useLeoRealtime from '@/hooks/useLeoRealtime';

const SOFT_CAP = 10_000;

type Props = {
  decoderId?: string | null;
};

export default function LeoLogger({ decoderId }: Props) {
  const [records, setRecords] = useState<LeoRecord[]>([]);
  const parentRef = useRef<HTMLDivElement | null>(null);

  const appendRecords = useCallback(
    (batch: LeoRecord[]) => {
      setRecords((prev) => {
        const filtered = batch.filter((r) => (decoderId ? r.decoderId === decoderId : true));
        if (!filtered.length) return prev;
        const merged = prev.concat(filtered);
        if (merged.length > SOFT_CAP) return merged.slice(merged.length - SOFT_CAP);
        return merged;
      });
    },
    [decoderId]
  );

  useLeoRealtime(appendRecords);

  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 8,
  });

  // scroll to bottom on new records
  useEffect(() => {
    if (virtualizer && records.length > 0) {
      virtualizer.scrollToIndex(records.length - 1, { align: 'end' });
    }
  }, [records.length, virtualizer]);

  return (
    <Card className="h-[calc(100vh-1rem)] w-[40rem] flex flex-col bg-card text-card-foreground dark:bg-card dark:text-card-foreground">
      <CardHeader>
        <CardTitle>Leo Live Log</CardTitle>
      </CardHeader>

      <CardContent className="p-0 flex flex-col flex-1">
        {/* Sticky Header */}
        <div className="grid grid-cols-[100px_100px_80px_1fr_100px] gap-2 px-2 py-1 border-b border-border text-xs font-semibold text-muted-foreground sticky top-0 bg-card z-10">
          <div>Project ID</div>
          <div>Counter</div>
          <div>Magic</div>
          <div>Payload</div>
          <div className="text-right">Time</div>
        </div>

        {/* Scrollable Virtualized List */}
        <div ref={parentRef} className="overflow-auto flex-1">
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = records[virtualRow.index];
              if (!item) return null;

              const bg =
                virtualRow.index % 2 === 0
                  ? 'bg-card/5 dark:bg-card/10'
                  : 'bg-card/10 dark:bg-card/20';

              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={`${bg} border-b border-border font-mono text-sm grid grid-cols-[100px_100px_80px_1fr_100px] gap-2 px-2 py-1`}
                >
                  <div>{item.projectId}</div>
                  <div>#{item.counter}</div>
                  <div>{item.magic}</div>
                  <div className="break-all">{item.payload}</div>
                  <div className="text-right text-xs text-muted-foreground">
                    {item.timeOfArrival}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}