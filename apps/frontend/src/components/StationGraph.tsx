import React, { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type StationLink = {
  host: string;
  port: number;
  active: boolean;
  counter: number;
  reachable?: boolean;
};

type Station = {
  id: string;
  name: string;
  stationLinks: StationLink[];
};

export function StationGraph({ station, onActivate }: { station: Station; onActivate: (stationId: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 320, h: 220 });

  useEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDims({ w: Math.max(280, r.width), h: 220 });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const stationX = Math.round(dims.w / 2);
  const stationY = 24; // moved 12px higher
  const linksY = 160; // links lower for more vertical gap
  const n = station.stationLinks.length;
  const linkXs = station.stationLinks.map((_, i) => ((i + 1) * dims.w) / (n + 1));

  const hasAnyActive = station.stationLinks.some(l => l.active && l.reachable !== false);
  const anyReachable = station.stationLinks.some(l => l.reachable !== false);
  const stationIsActivatable = anyReachable && !station.stationLinks.some(l => l.active === true);

  return (
    <div ref={containerRef} className="relative w-full" style={{ minWidth: 280, height: dims.h }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${dims.w} ${dims.h}`} preserveAspectRatio="none">
        {/* edges */}
        {station.stationLinks.map((link, i) => {
          const x1 = stationX;
          const y1 = stationY + 12; // bottom of station
          const x2 = linkXs[i];
          const y2 = linksY - 12;
          const active = link.active;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={active ? '#06b6d4' : '#94a3b8'}
              strokeWidth={active ? 2.5 : 1.5}
              strokeDasharray="3 4"
              style={{ transition: 'stroke-width .18s ease, stroke .18s ease, opacity .2s' }}
            >
              {active && (
                <>
                  <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="stroke-width" values="2.5;6;2.5" dur="0.6s" repeatCount="indefinite" />
                </>
              )}
            </line>
          );
        })}

        {/* optional pulsing station ring when any active */}
        {hasAnyActive && (
          <circle cx={stationX} cy={stationY + 12} r={22} fill="none" stroke="#06b6d4" strokeWidth={8} opacity={0.3}>
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.8s" repeatCount="indefinite" />
            <animate attributeName="r" values="18;34;18" dur="0.8s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* station node */}
      <div style={{ left: stationX, top: `${stationY - 12}px` }} className="absolute flex items-center justify-center pointer-events-auto transform -translate-x-1/2">
        <button
          onClick={() => stationIsActivatable && onActivate(station.id)}
          disabled={!stationIsActivatable}
          aria-disabled={!stationIsActivatable}
          className={`flex items-center justify-center h-12 w-12 rounded-full transition-transform focus:outline-none ${hasAnyActive ? 'bg-cyan-500 text-white scale-105' : stationIsActivatable ? 'bg-slate-100 text-slate-700 hover:scale-105' : 'bg-slate-700/10 text-muted-foreground cursor-not-allowed'}`}
          aria-label={`Station ${station.name}`}
        >
          <Radio className="h-6 w-6" />
        </button>
      </div>

      {/* link nodes */}
      {station.stationLinks.map((link, i) => {
        const x = Math.round(linkXs[i]);
        const active = link.active;
        return (
          <div key={i} style={{ left: x, top: `${linksY - 12}px` }} className="absolute flex items-center justify-center pointer-events-none transform -translate-x-1/2">
            <div className="relative">
              <button
                onClick={() => (link.reachable !== false && !link.active) && onActivate(station.id)}
                disabled={link.reachable === false || link.active}
                aria-disabled={link.reachable === false || link.active}
                className={`peer pointer-events-auto flex items-center justify-center h-9 w-9 rounded-full transition-transform focus:outline-none ${active ? 'bg-cyan-500 text-white scale-110' : link.reachable === false ? 'bg-red-50 text-red-600 border border-red-100 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-600'}`}
                aria-pressed={active}
              >
                <Radio className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
              </button>

              {/* tooltip on hover - only visible when button (peer) is hovered */}
              <div className="pointer-events-none absolute -bottom-24 left-1/2 transform -translate-x-1/2 opacity-0 peer-hover:opacity-100 transition-opacity z-50">
                <div className="bg-card border rounded-md p-2 text-xs shadow-md w-56">
                  <div className="mb-1 text-card-foreground">
                    <div className="text-[12px]"><span className="font-medium">IP:</span> <span className="text-muted-foreground ml-1">{String(link.host)}</span></div>
                    <div className="text-[12px]"><span className="font-medium">Port:</span> <span className="text-muted-foreground ml-1">{String(link.port)}</span></div>
                        <div className="text-[12px]"><span className="font-medium">Status:</span> <span className="text-muted-foreground ml-1">{link.reachable === false ? 'Unreachable' : link.active ? 'Active' : 'Inactive'}</span></div>
                    <div className="text-[12px]"><span className="font-medium">Counter:</span> <span className="text-muted-foreground ml-1">{link.counter}</span></div>
                  </div>
                </div>
              </div>

              {/* subtle pulse for active link */}
              {active && (
                <div className="absolute inset-0 -z-10 flex items-center justify-center">
                  <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(6,182,212,0.12)' }}>
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="28" cy="28" r="22" fill="#06b6d4" opacity="0.06">
                        <animate attributeName="opacity" values="0.06;0.22;0.06" dur="1s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StationGraph;
