import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Search, Trash2, TerminalSquare } from 'lucide-react';
import type { LeoRecord } from '@/types/leo.types';
import useLeoRealtime from '@/hooks/useLeoRealtime';
import { usePresetStatus } from '@/hooks/usePresetStatus';
import { pb } from '@/lib/pocketbase';

const SOFT_CAP = 10_000;

type Props = {
  decoderId?: string | null;
};

export default function LeoLogger({ decoderId }: Props) {
  const [records, setRecords] = useState<LeoRecord[]>([]);
  const parentRef = useRef<HTMLDivElement | null>(null);
  
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // We need to keep a ref to isPaused so the callback doesn't need to rebuild on toggle
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!decoderId) {
      setRecords([]);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const result = await pb.collection('leo').getList<LeoRecord>(1, 200, {
          filter: `decoderId = "${decoderId}"`,
          sort: '-created',
        });
        if (!isMounted) return;

        const history = result.items.reverse().map(r => ({
          id: r.id,
          projectId: String(r.projectId ?? ''),
          counter: Number(r.counter ?? 0),
          magic: Number(r.magic ?? 0),
          payload: String(r.payload ?? ''),
          timeOfArrival: String(r.timeOfArrival ?? ''),
          decoderId: String(r.decoderId ?? ''),
          created: r.created,
        }));

        setRecords((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newHistory = history.filter((h) => h.id && !existingIds.has(h.id));
          
          let merged = [...newHistory, ...prev];
          merged.sort((a, b) => new Date(a.timeOfArrival).getTime() - new Date(b.timeOfArrival).getTime());

          if (merged.length > SOFT_CAP) {
            merged = merged.slice(merged.length - SOFT_CAP);
          }
          return merged;
        });
      } catch (err) {
        console.error('Failed to fetch historical leo logs', err);
      }
    };

    setRecords([]); // clear before we re-fetch to avoid mixed decoders
    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [decoderId]);

  const appendRecords = useCallback(
    (batch: LeoRecord[]) => {
      // If paused, we simply drop new records to save memory and avoid moving list
      if (isPausedRef.current) return;

      setRecords((prev) => {
        const filtered = batch.filter((r) => (decoderId ? r.decoderId === decoderId : true));
        if (!filtered.length) return prev;
        
        const existingIds = new Set(prev.map(p => p.id));
        const newBatch = filtered.filter(f => f.id && !existingIds.has(f.id));
        if (!newBatch.length) return prev;

        const merged = prev.concat(newBatch);
        if (merged.length > SOFT_CAP) return merged.slice(merged.length - SOFT_CAP);
        return merged;
      });
    },
    [decoderId]
  );

  useLeoRealtime(appendRecords);

  const displayedRecords = useMemo(() => {
    if (!searchQuery) return records;
    const lowerQ = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.payload.toLowerCase().includes(lowerQ) ||
        r.projectId.toLowerCase().includes(lowerQ) ||
        r.decoderId.toLowerCase().includes(lowerQ) ||
        r.magic.toString().includes(lowerQ)
    );
  }, [records, searchQuery]);

  const presetStatus = usePresetStatus(records);

  const virtualizer = useVirtualizer({
    count: displayedRecords.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // slightly smaller height for tighter rows
    overscan: 10,
  });

  // scroll to bottom on new records if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && virtualizer && displayedRecords.length > 0) {
      virtualizer.scrollToIndex(displayedRecords.length - 1, { align: 'end' });
    }
  }, [displayedRecords.length, virtualizer, autoScroll]);

  const handleScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    // If user scrolled up, disable autoScroll. If they scroll to bottom, enable it.
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    setAutoScroll(isAtBottom);
  };

  return (
    <Card className="h-full flex flex-col bg-card/50 backdrop-blur-sm border shadow-sm">
      <CardHeader className="p-4 border-b bg-card rounded-t-xl shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 text-primary rounded-md">
              <TerminalSquare className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Live Decoder Logs
                {isPaused && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                    PAUSED
                  </span>
                )}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-0.5">
                {records.length} records {searchQuery ? `(${displayedRecords.length} matched)` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[160px] sm:w-[220px] h-9 pl-9 text-sm bg-background"
              />
            </div>
            <Button
              variant={isPaused ? "default" : "secondary"}
              size="sm"
              className="h-9 px-3 gap-2"
              onClick={() => {
                setIsPaused(!isPaused);
                if (isPaused) setAutoScroll(true); // turning play back on -> auto scroll
              }}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
              onClick={() => setRecords([])}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
        {/* Sticky Header */}
        <div className="grid grid-cols-[80px_100px_80px_80px_1fr_100px] gap-3 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground bg-muted/40 z-10 shrink-0">
          <div>Decoder</div>
          <div>Project ID</div>
          <div>Counter</div>
          <div>Magic</div>
          <div>Payload</div>
          <div className="text-right">Time</div>
        </div>

        {/* Scrollable Virtualized List */}
        <div 
          ref={parentRef} 
          className="overflow-auto flex-1 bg-background/50 relative"
          onScroll={handleScroll}
        >
          {displayedRecords.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <TerminalSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Waiting for incoming logs...</p>
            </div>
          ) : (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const item = displayedRecords[virtualRow.index];
                if (!item) return null;

                // Check if this log matches the active preset
                const isPresetLog = presetStatus.isActive && presetStatus.actions.some(
                  (a) => a.project === item.projectId && a.payload === item.payload
                );

                let bg =
                  virtualRow.index % 2 === 0
                    ? 'hover:bg-muted/50'
                    : 'bg-muted/20 hover:bg-muted/50';

                // Colorize row if a preset is active
                if (presetStatus.isActive) {
                   if (isPresetLog) {
                     bg = 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20';
                   } else {
                     bg = 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20';
                   }
                }

                return (
                  <div
                    key={`${item.id}-${virtualRow.index}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={`${bg} border-b border-border/50 font-mono text-[13px] grid grid-cols-[80px_100px_80px_80px_1fr_100px] items-center gap-3 px-4 transition-colors`}
                  >
                    <div className="text-muted-foreground truncate" title={item.decoderId}>
                      {item.decoderId || '—'}
                    </div>
                    <div className={`truncate ${presetStatus.isActive && !isPresetLog ? 'text-red-700 dark:text-red-400' : 'text-primary/80'}`} title={item.projectId}>
                      {item.projectId}
                    </div>
                    <div className="text-muted-foreground">#{item.counter}</div>
                    <div className="text-muted-foreground">{item.magic}</div>
                    <div className="truncate pr-4" title={item.payload}>
                      {item.payload}
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                      {item.timeOfArrival.substring(11, 23)} {/* showing usually HH:mm:ss.SSS if it's ISO, or whatever String it is */}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}