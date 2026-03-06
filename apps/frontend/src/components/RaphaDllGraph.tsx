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

type Point = { ts: number; value: number; decoderId?: string };

export default function RaphaDllGraph({ decoderId }: { decoderId?: string | null } = {}) {
  useRaphaRealtime();
  const allPoints = useSelector((s: RootState) => s.rapha?.dllResults ?? []);
  const points = decoderId ? allPoints.filter((p) => p.decoderId === decoderId) : allPoints;
  const now = Date.now();
  const cutoff = now - 60_000;
  const data = React.useMemo(() => points.filter((p) => p.ts >= cutoff).sort((a, b) => a.ts - b.ts), [points]);

  return (
    <div style={{ width: '100%', height: 200 }}>
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
            allowDecimals={false}
            // tick={{ fontSize: 11 }}
          />
          <Tooltip
            labelFormatter={(v) => new Date(v as number).toLocaleTimeString()}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
