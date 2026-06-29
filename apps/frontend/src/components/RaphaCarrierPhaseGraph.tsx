import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function RaphaCarrierPhaseGraph({
  decoderId,
}: {
  decoderId?: string | null;
} = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  const xRef = useRef<Float64Array>(new Float64Array(800));
  const yRef = useRef<Float64Array>(new Float64Array(800));
  const lastTsRef = useRef(0);

  const allPoints = useSelector(
    (s: RootState) => s.rapha?.carrierPhasePoints ?? [],
  );

  // INIT CHART (once)
  useEffect(() => {
    if (!containerRef.current) return;

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height: 200,

      scales: {
        x: { time: true },
        y: { auto: true },
      },

      series: [
        {},
        {
          label: 'Carrier Phase',
          stroke: '#f09328',
          width: 2,
        },
      ],

      axes: [{ stroke: '#888' }, { stroke: '#888' }],
    };

    plotRef.current = new uPlot(opts, [[], []], containerRef.current);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, []);

  // UPDATE DATA (fast, no allocations)
  useEffect(() => {
    const now = Date.now();
    const cutoff = now - 60_000;

    const x = xRef.current;
    const y = yRef.current;

    let len = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let i = allPoints.length - 1; i >= 0 && len < 800; i--) {
      const p = allPoints[i];

      if (decoderId && p.decoderId !== decoderId) continue;
      if (p.ts < cutoff) break;

      const idx = 799 - len;

      x[idx] = p.ts / 1000;
      y[idx] = p.value;

      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;

      len++;
    }

    if (len === 0) return;

    const start = 800 - len;

    const lastTs = x[799];
    if (lastTs === lastTsRef.current) return;
    lastTsRef.current = lastTs;

    const plot = plotRef.current;
    if (!plot) return;

    plot.setData([x.subarray(start, 800), y.subarray(start, 800)]);

    const nowSec = now / 1000;

    plot.setScale('x', {
      min: nowSec - 60,
      max: nowSec,
    });

    const pad = (max - min) * 0.1 || 1;

    plot.setScale('y', {
      min: min - pad,
      max: max + pad,
    });
  }, [allPoints, decoderId]);

  // RESIZE
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (!plotRef.current || !containerRef.current) return;

      plotRef.current.setSize({
        width: containerRef.current.clientWidth,
        height: 200,
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: 200 }} />;
}
