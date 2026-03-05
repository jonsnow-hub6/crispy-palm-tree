import React, { useState, useMemo, useEffect, useRef } from 'react';
import RaphaPllGraph from '@/components/RaphaPllGraph';
import RaphaDllGraph from '@/components/RaphaDllGraph';
import LeoLogger from '@/components/LeoLogger';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRaphaRealtime } from '@/hooks/useRaphaRealtime';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function RaphaPage() {
  useRaphaRealtime();

  const pllPoints = useSelector((s: RootState) => s.rapha?.pllPoints ?? []);
  const dllPoints = useSelector((s: RootState) => s.rapha?.dllResults ?? []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDecoder, setSelectedDecoder] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const decoders = useMemo(() => {
    const set = new Set<string>();
    for (const p of pllPoints) if (p.decoderId) set.add(p.decoderId);
    for (const p of dllPoints) if (p.decoderId) set.add(p.decoderId);
    return Array.from(set).sort();
  }, [pllPoints, dllPoints]);

  useEffect(() => {
    if (!selectedDecoder && decoders.length > 0) setSelectedDecoder(decoders[0]);
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
  const cutoff = Date.now() - 60_000;
  const filteredPllPoints = selectedDecoder
    ? pllPoints.filter((p) => p.decoderId === selectedDecoder)
    : pllPoints;
  const recent = filteredPllPoints.filter((p) => p.ts >= cutoff);
  const total = recent.length;
  const ones = recent.filter((p) => p.value === 1).length;
  const percentage = total > 0 ? Math.round((ones / total) * 100) : 0;
  const lastOne = filteredPllPoints.slice().reverse().find((p) => p.value === 1 && p.ts >= cutoff);
  const lastOneLabel = lastOne ? new Date(lastOne.ts).toLocaleTimeString() : '—';

  return (
      <div className="flex gap-6 min-h-screen">
        {/* Left: Graphs - 80% */}
        <div className="flex-1 space-y-6">
          <div className="flex items-start justify-between">
            <div ref={menuRef} className="relative">
              <Button onClick={() => setMenuOpen((s) => !s)}>
                {selectedDecoder ?? 'No decoders'}
              </Button>
              {menuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-card border rounded-md shadow-md z-40">
                  <div className="py-1">
                    {decoders.map((d) => (
                      <button
                        key={d}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-accent/60"
                        onClick={() => {
                          setSelectedDecoder(d);
                          setMenuOpen(false);
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground text-right">
              <div>Last locked: <span className="font-medium">{lastOneLabel}</span></div>
              <div>Locked %: <span className="font-medium">{percentage}%</span></div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>PLL Lock State (last 60s)</CardTitle>
            </CardHeader>
            <CardContent>
              <RaphaPllGraph decoderId={selectedDecoder ?? undefined} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DLL multiply (dllM2 × dllM4) (last 60s)</CardTitle>
            </CardHeader>
            <CardContent>
              <RaphaDllGraph decoderId={selectedDecoder ?? undefined} />
            </CardContent>
          </Card>
        </div>

        {/* Right: Logger - 20% */}
        <div className="h-screen">
          <LeoLogger decoderId={selectedDecoder ?? undefined} />
        </div>
    </div>
  );
}