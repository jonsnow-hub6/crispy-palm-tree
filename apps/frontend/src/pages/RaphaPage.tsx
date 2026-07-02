import React, { useState, useMemo, useEffect, useRef } from 'react';
import RaphaPllGraph from '@/components/RaphaPllGraph';
import RaphaSnrGraph from '@/components/RaphaSnrGraph';
import RaphaCarrierPhaseGraph from '@/components/RaphaCarrierPhaseGraph';
import LeoLogger from '@/components/LeoLogger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRaphaRealtime } from '@/hooks/useRaphaRealtime';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ChevronDown, Layers, Activity } from 'lucide-react';

export default function RaphaPage() {
  useRaphaRealtime();

  const pllPoints = useSelector((s: RootState) => s.rapha?.pllPoints ?? []);
  const snrPoints = useSelector((s: RootState) => s.rapha?.snrPoints ?? []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDecoder, setSelectedDecoder] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const decoders = useMemo(() => {
    const set = new Set<string>();
    for (const p of pllPoints) if (p.decoderId) set.add(p.decoderId);
    for (const p of snrPoints) if (p.decoderId) set.add(p.decoderId);
    return Array.from(set).sort();
  }, [pllPoints, snrPoints]);

  useEffect(() => {
    if (!selectedDecoder && decoders.length > 0)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDecoder(decoders[0]);
  }, [decoders, selectedDecoder]);

  // click outside handler for menu
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current || !e.target) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [menuOpen]);

  // Stats for last 60s
  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - 60_000;
  const filteredPllPoints = selectedDecoder
    ? pllPoints.filter((p) => p.decoderId === selectedDecoder)
    : pllPoints;
  const recent = filteredPllPoints.filter((p) => p.ts >= cutoff);
  const total = recent.length;
  const ones = recent.filter((p) => p.value === 1).length;
  const percentage = total > 0 ? Math.round((ones / total) * 100) : 0;
  const lastOne = filteredPllPoints
    .slice()
    .reverse()
    .find((p) => p.value === 1 && p.ts >= cutoff);
  const lastOneLabel = lastOne
    ? new Date(lastOne.ts).toLocaleTimeString()
    : '—';

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 bg-background overflow-auto">
      {/* Left: Graphs - ~60% to 70% width based on preference */}
      <div className="flex-[3] space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 text-primary rounded-lg hidden sm:block">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold leading-none tracking-tight">
                Decoder
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time status of connected decoders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div ref={menuRef} className="relative">
              <Button
                variant="outline"
                onClick={() => setMenuOpen((s) => !s)}
                className="w-[180px] justify-between font-medium"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">
                    {selectedDecoder ?? 'No decoders'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-full sm:w-56 bg-card border rounded-md shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="py-1 max-h-64 overflow-auto">
                    {decoders.map((d) => (
                      <button
                        key={d}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${selectedDecoder === d ? 'bg-accent/50 font-medium' : ''}`}
                        onClick={() => {
                          setSelectedDecoder(d);
                          setMenuOpen(false);
                        }}
                      >
                        <span className="truncate">{d}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-sm text-right bg-muted/50 px-4 py-2 rounded-lg border">
              <div className="text-muted-foreground mb-0.5">
                Last locked:{' '}
                <span className="font-medium text-foreground">
                  {lastOneLabel}
                </span>
              </div>
              <div className="text-muted-foreground">
                Locked %:{' '}
                <span className="font-medium text-foreground">
                  {percentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span>PLL Lock State</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  last 60s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RaphaPllGraph decoderId={selectedDecoder ?? undefined} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span>Carrier Phase</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  last 60s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RaphaCarrierPhaseGraph
                decoderId={selectedDecoder ?? undefined}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span>SNR</span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  last 60s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RaphaSnrGraph decoderId={selectedDecoder ?? undefined} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right: Logger - ~40% to 30% width */}
      <div className="flex-[2] h-[calc(100vh-6.5rem)] min-w-0 sticky top-0">
        <LeoLogger decoderId={selectedDecoder ?? undefined} />
      </div>
    </div>
  );
}
