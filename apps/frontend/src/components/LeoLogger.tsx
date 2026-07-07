import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Play,
  Pause,
  Search,
  Trash2,
  TerminalSquare,
  Wand2,
} from 'lucide-react';
import type { LeoRecord } from '@/types/leo.types';
import useLeoRealtime from '@/hooks/useLeoRealtime';
import { pb } from '@/lib/pocketbase';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { fetchStations } from '@/store/slices/stationsSlice';

const SOFT_CAP = 200; // only keep the latest 200 logs in this view

type Props = {
  decoderId?: string | null;
};

export default function LeoLogger({ decoderId }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const [records, setRecords] = useState<LeoRecord[]>([]);
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dispatch(fetchStations());
  }, [dispatch]);

  const [counterDelta, setCounterDelta] = useState('0');

  useEffect(() => {
    let isMounted = true;
    pb.collection('settings')
      .getFirstListItem('key="delta"')
      .then((record) => {
        if (isMounted && record) {
          setCounterDelta(record.value as string);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const record = await pb
          .collection('settings')
          .getFirstListItem('key="delta"');
        await pb
          .collection('settings')
          .update(record.id, { value: counterDelta });
      } catch {
        try {
          await pb
            .collection('settings')
            .create({ key: 'delta', value: counterDelta });
        } catch {
          // Ignore
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [counterDelta]);

  const hasLatestCounterMismatch = useMemo(() => {
    if (records.length === 0) return false;
    const latest = records[records.length - 1];
    // Use the stored flag set at arrival time — not a live re-evaluation
    return latest.isCounterCorrect === false;
  }, [records]);

  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expectedMagic, setExpectedMagic] = useState('');

  useEffect(() => {
    let isMounted = true;
    pb.collection('settings')
      .getFirstListItem('key="magic"')
      .then((record) => {
        if (isMounted && record) {
          setExpectedMagic(record.value as string);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const record = await pb
          .collection('settings')
          .getFirstListItem('key="magic"');
        await pb
          .collection('settings')
          .update(record.id, { value: expectedMagic });
      } catch {
        try {
          await pb
            .collection('settings')
            .create({ key: 'magic', value: expectedMagic });
        } catch {
          // Ignore
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [expectedMagic]);

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
      console.log('Fetching history for', decoderId);
      try {
        const result = await pb.collection('leo').getList<LeoRecord>(1, 200, {
          filter: `decoderId = "${decoderId}"`,
          sort: '-created',
        });
        if (!isMounted) return;

        const MAX_PAYLOAD_STORED = 1024;
        const history = result.items.reverse().map((r) => {
          const RAW_PAYLOAD = String(r.payload ?? '');
          return {
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
            isCounterCorrect:
              r.isCounterCorrect !== undefined ? r.isCounterCorrect : null,
            presetId: r.presetId || null,
            presetIndex: r.presetIndex !== undefined ? r.presetIndex : null,
            presetStatus: r.presetStatus || null,
          };
        });

        setRecords((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newHistory = history.filter(
            (h) => h.id && !existingIds.has(h.id),
          );

          let merged = [...newHistory, ...prev];
          merged.sort(
            (a, b) =>
              new Date(a.timeOfArrival).getTime() -
              new Date(b.timeOfArrival).getTime(),
          );

          if (merged.length > SOFT_CAP) {
            merged = merged.slice(merged.length - SOFT_CAP);
          }
          return merged;
        });
      } catch (err) {
        console.error('Failed to subscribe to leo', {
          err,
          baseUrl: pb.baseURL,
          auth: pb.authStore.isValid,
          token: pb.authStore.token,
        });

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
        const filtered = batch.filter((r) =>
          decoderId ? r.decoderId === decoderId : true,
        );
        if (!filtered.length) return prev;

        const existingIds = new Set(prev.map((p) => p.id));
        const newBatch = filtered.filter((f) => f.id && !existingIds.has(f.id));
        if (!newBatch.length) return prev;

        const merged = prev.concat(newBatch);
        if (merged.length > SOFT_CAP)
          return merged.slice(merged.length - SOFT_CAP);
        return merged;
      });
    },
    [decoderId],
  );

  useEffect(() => {
    console.log('decoderId changed:', decoderId);
  }, [decoderId]);

  useLeoRealtime(appendRecords);

  const displayedRecords = useMemo(() => {
    if (!searchQuery) return records;
    const lowerQ = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.payload.toLowerCase().includes(lowerQ) ||
        r.projectId.toLowerCase().includes(lowerQ) ||
        r.decoderId.toLowerCase().includes(lowerQ) ||
        r.magic.toString().includes(lowerQ) ||
        r.messageType.toString().includes(lowerQ) ||
        r.management.toString().includes(lowerQ) ||
        r.threshold.toString().includes(lowerQ) ||
        r.timeOfArrival.toLowerCase().includes(lowerQ) ||
        r.reserved.toLowerCase().includes(lowerQ),
    );
  }, [records, searchQuery]);

  // eslint-disable-next-line react-hooks/incompatible-library
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
      <CardHeader className="px-4 py-2.5 border-b bg-card rounded-t-xl shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <TerminalSquare className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-sm whitespace-nowrap">
              Logs
            </span>
            {isPaused && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold whitespace-nowrap">
                PAUSED
              </span>
            )}
            {hasLatestCounterMismatch && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold animate-pulse border border-red-500/20 whitespace-nowrap">
                COUNTER ⚠
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="relative">
              <Wand2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                data-cy="schema-form-field-magic"
                placeholder="Magic"
                value={expectedMagic}
                onChange={(e) => setExpectedMagic(e.target.value)}
                className="w-[110px] h-8 pl-7 text-xs bg-background border-dashed focus-visible:border-solid"
                title="Highlight logs that do not match this magic number"
              />
            </div>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground select-none">
                Δ
              </span>
              <Input
                type="number"
                placeholder="0"
                value={counterDelta}
                onChange={(e) => setCounterDelta(e.target.value)}
                className="w-[70px] h-8 pl-5 text-xs bg-background border-dashed focus-visible:border-solid"
                title="Allowed delta for the counter between the links and the logs"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[100px] h-8 pl-7 text-xs bg-background"
              />
            </div>
            <Button
              variant={isPaused ? 'default' : 'secondary'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setIsPaused(!isPaused);
                if (isPaused) setAutoScroll(true);
              }}
            >
              {isPaused ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive border-border"
              onClick={() => setRecords([])}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
        <div className="grid grid-cols-[40px_60px_90px_140px_40px_40px_40px_1fr] gap-3 px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground bg-muted/40 z-10 shrink-0">
          <div className="truncate text-left" title="Project ID">
            Proj ID
          </div>
          <div className="truncate text-left">Counter</div>
          <div className="truncate text-left">Magic</div>
          <div className="truncate text-left">Reserved</div>
          <div className="truncate text-left" title="Message Type">
            Msg
          </div>
          <div className="truncate text-left" title="Management">
            Mgmt
          </div>
          <div className="truncate text-left" title="Threshold">
            Thr
          </div>
          <div className="text-left">Time</div>
        </div>

        {/* Scrollable Virtualized List */}
        <div
          ref={parentRef}
          className="overflow-auto flex-1 bg-background/50 relative scrollbar"
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

                let bg =
                  virtualRow.index % 2 === 0
                    ? 'hover:bg-muted/50'
                    : 'bg-muted/20 hover:bg-muted/50';

                // Colorize row based on stored preset sequence validation status
                if (item.presetStatus) {
                  if (item.presetStatus === 'valid') {
                    bg =
                      'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20';
                  } else if (item.presetStatus === 'incomplete_old_preset') {
                    bg =
                      'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-l-4 border-l-amber-500';
                  } else {
                    bg =
                      'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 border-l-4 border-l-red-500';
                  }
                }

                const magicMismatch =
                  expectedMagic.trim() !== '' &&
                  item.magic.toString() !== expectedMagic.trim();

                return (
                  <div
                    data-cy="leo-log"
                    data-status={
                      item.presetStatus === 'valid'
                        ? `Preset Action #${(item.presetIndex ?? 0) + 1} (Valid)`
                        : item.presetStatus === 'incorrect_order'
                          ? `Incorrect Order: Expected action #${(item.presetIndex ?? 0) + 1}`
                          : item.presetStatus === 'unexpected_action'
                            ? `Unexpected Action: Not in preset`
                            : item.presetStatus === 'incomplete_old_preset'
                              ? `Incomplete Old Preset transition`
                              : `Project ID: ${item.projectId}`
                    }
                    data-magic-mismatch={magicMismatch}
                    key={`${item.id}-${virtualRow.index}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={`${bg} border-b border-border/50 font-mono tabular-nums text-[12px] sm:text-[13px] grid grid-cols-[40px_60px_90px_140px_40px_40px_40px_1fr] items-center gap-3 px-4 transition-colors`}
                  >
                    <div
                      className={`truncate text-left ${item.presetStatus && item.presetStatus !== 'valid' ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-primary/80'}`}
                      title={
                        item.presetStatus === 'valid'
                          ? `Preset Action #${(item.presetIndex ?? 0) + 1} (Valid)`
                          : item.presetStatus === 'incorrect_order'
                            ? `Incorrect Order: Expected action #${(item.presetIndex ?? 0) + 1}`
                            : item.presetStatus === 'unexpected_action'
                              ? `Unexpected Action: Not in preset`
                              : item.presetStatus === 'incomplete_old_preset'
                                ? `Incomplete Old Preset transition`
                                : `Project ID: ${item.projectId}`
                      }
                    >
                      {item.projectId}
                    </div>
                    <div
                      className={`text-left ${item.isCounterCorrect === false ? 'text-red-500 dark:text-red-400 font-bold animate-pulse' : 'text-muted-foreground'}`}
                      title={
                        item.isCounterCorrect === false
                          ? `Counter mismatch detected at arrival time (counter: #${item.counter})`
                          : undefined
                      }
                    >
                      #{item.counter}
                    </div>
                    <div
                      className={`text-left ${magicMismatch ? '!text-red-600 dark:!text-red-500 font-bold underline' : 'text-muted-foreground'}`}
                    >
                      {item.magic}
                    </div>
                    <div
                      className="text-muted-foreground text-left truncate"
                      title={item.reserved}
                    >
                      {item.reserved}
                    </div>
                    <div className="text-muted-foreground text-left truncate">
                      {item.messageType}
                    </div>
                    <div className="text-muted-foreground text-left truncate">
                      {item.management}
                    </div>
                    <div className="text-muted-foreground text-left truncate">
                      {item.threshold}
                    </div>
                    <div className="text-left text-[11px] text-muted-foreground whitespace-nowrap">
                      {item.timeOfArrival.slice(0, 19)}
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
