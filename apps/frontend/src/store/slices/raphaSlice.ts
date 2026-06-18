import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Point = { ts: number; value: number; decoderId?: string };

interface RaphaState {
  pllPoints: Point[];
  dllResults: Point[];
  carrierPhasePoints: Point[];
  maxPoints: number;
}

const initialState: RaphaState = {
  pllPoints: [],
  dllResults: [],
  carrierPhasePoints: [],
  maxPoints: 1200,
};

function pruneInPlace(points: Point[], maxPoints: number) {
  const cutoff = Date.now() - 60_000;

  // Ensure we only keep points within the last 60s regardless of ordering.
  let write = 0;
  for (let read = 0; read < points.length; read++) {
    if (points[read].ts >= cutoff) {
      if (write !== read) points[write] = points[read];
      write++;
    }
  }
  if (write !== points.length) points.splice(write);

  // Hard cap by size (keep newest by slicing end)
  if (points.length > maxPoints) {
    points.splice(0, points.length - maxPoints);
  }
}

const raphaSlice = createSlice({
  name: 'rapha',
  initialState,
  reducers: {
    addPllPoints: (state, action: PayloadAction<Point[]>) => {
      // Merge incoming points, then keep only last 60s and enforce maxPoints.
      const cutoff = Date.now() - 60_000;
      const merged = state.pllPoints.concat(action.payload);
      const filtered = merged.filter((p) => p.ts >= cutoff);
      filtered.sort((a, b) => a.ts - b.ts);
      if (filtered.length > state.maxPoints) {
        state.pllPoints = filtered.slice(filtered.length - state.maxPoints);
      } else {
        state.pllPoints = filtered;
      }
    },

    addDllResults: (state, action: PayloadAction<Point[]>) => {
      // Merge incoming points, then keep only last 60s and enforce maxPoints.
      const cutoff = Date.now() - 60_000;
      const merged = state.dllResults.concat(action.payload);
      const filtered = merged.filter((p) => p.ts >= cutoff);
      filtered.sort((a, b) => a.ts - b.ts);
      if (filtered.length > state.maxPoints) {
        state.dllResults = filtered.slice(filtered.length - state.maxPoints);
      } else {
        state.dllResults = filtered;
      }
    },

    addCarrierPhasePoints: (state, action: PayloadAction<Point[]>) => {
      const cutoff = Date.now() - 60_000;
      const merged = state.carrierPhasePoints.concat(action.payload);
      const filtered = merged.filter((p) => p.ts >= cutoff);
      filtered.sort((a, b) => a.ts - b.ts);
      if (filtered.length > state.maxPoints) {
        state.carrierPhasePoints = filtered.slice(filtered.length - state.maxPoints);
      } else {
        state.carrierPhasePoints = filtered;
      }
    },

    resetRapha: (state) => {
      state.pllPoints.length = 0;
      state.dllResults.length = 0;
      state.carrierPhasePoints.length = 0;
    },

    // Force-trim both series to the last 60s and enforce maxPoints.
    trimToLast60s: (state) => {
      const cutoff = Date.now() - 60_000;
      state.pllPoints = state.pllPoints.filter((p) => p.ts >= cutoff);
      state.dllResults = state.dllResults.filter((p) => p.ts >= cutoff);
      state.carrierPhasePoints = state.carrierPhasePoints.filter((p) => p.ts >= cutoff);

      if (state.pllPoints.length > state.maxPoints) {
        state.pllPoints.splice(0, state.pllPoints.length - state.maxPoints);
      }
      if (state.dllResults.length > state.maxPoints) {
        state.dllResults.splice(0, state.dllResults.length - state.maxPoints);
      }
      if (state.carrierPhasePoints.length > state.maxPoints) {
        state.carrierPhasePoints.splice(0, state.carrierPhasePoints.length - state.maxPoints);
      }
    },
  },
});

export const { addPllPoints, addDllResults, addCarrierPhasePoints, resetRapha, trimToLast60s } = raphaSlice.actions;
export default raphaSlice.reducer;