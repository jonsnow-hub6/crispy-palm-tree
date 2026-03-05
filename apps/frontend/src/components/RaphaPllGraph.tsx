import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import useRaphaRealtime from '@/hooks/useRaphaRealtime';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

type Point = { ts: number; value: 0 | 1; decoderId?: string };

export default function RaphaPllGraph({ decoderId }: { decoderId?: string | null } = {}) {
  useRaphaRealtime();
  const allPoints = useSelector((s: RootState) => s.rapha?.pllPoints ?? []);
  const points = decoderId ? allPoints.filter((p) => p.decoderId === decoderId) : allPoints;
  const now = Date.now();
  const cutoff = now - 60_000;
  const data = points.filter((p) => p.ts >= cutoff).map((p) => ({ ts: p.ts, value: p.value })).sort((a, b) => a.ts - b.ts);

  return (
    <div style={{ width: '100%', height: 140 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            domain={[cutoff, now]}
            type="number"
            tickFormatter={(v) => new Date(v).toLocaleTimeString()}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 1]}
            allowDecimals={false}
            tick={{ fontSize: 11 }}
          />
          <Tooltip labelFormatter={(v) => new Date(v as number).toLocaleTimeString()} />
          <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
