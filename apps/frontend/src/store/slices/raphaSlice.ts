import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Point = { ts: number; value: number; decoderId?: string };

interface RaphaState {
  pllPoints: Point[];
  snrPoints: Point[];
  carrierPhasePoints: Point[];
  maxPoints: number;
}

const initialState: RaphaState = {
  pllPoints: [],
  snrPoints: [],
  carrierPhasePoints: [],
  maxPoints: 1200,
};

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

    addSnrPoints: (state, action: PayloadAction<Point[]>) => {
      const cutoff = Date.now() - 60_000;
      const merged = state.snrPoints.concat(action.payload);
      const filtered = merged.filter((p) => p.ts >= cutoff);
      filtered.sort((a, b) => a.ts - b.ts);
      if (filtered.length > state.maxPoints) {
        state.snrPoints = filtered.slice(filtered.length - state.maxPoints);
      } else {
        state.snrPoints = filtered;
      }
    },

    addCarrierPhasePoints: (state, action: PayloadAction<Point[]>) => {
      const cutoff = Date.now() - 60_000;
      const merged = state.carrierPhasePoints.concat(action.payload);
      const filtered = merged.filter((p) => p.ts >= cutoff);
      filtered.sort((a, b) => a.ts - b.ts);
      if (filtered.length > state.maxPoints) {
        state.carrierPhasePoints = filtered.slice(
          filtered.length - state.maxPoints,
        );
      } else {
        state.carrierPhasePoints = filtered;
      }
    },

    resetRapha: (state) => {
      state.pllPoints.length = 0;
      state.snrPoints.length = 0;
      state.carrierPhasePoints.length = 0;
    },

    // Force-trim both series to the last 60s and enforce maxPoints.
    trimToLast60s: (state) => {
      const cutoff = Date.now() - 60_000;
      state.pllPoints = state.pllPoints.filter((p) => p.ts >= cutoff);
      state.snrPoints = state.snrPoints.filter((p) => p.ts >= cutoff);
      state.carrierPhasePoints = state.carrierPhasePoints.filter(
        (p) => p.ts >= cutoff,
      );

      if (state.pllPoints.length > state.maxPoints) {
        state.pllPoints.splice(0, state.pllPoints.length - state.maxPoints);
      }
      if (state.snrPoints.length > state.maxPoints) {
        state.snrPoints.splice(0, state.snrPoints.length - state.maxPoints);
      }
      if (state.carrierPhasePoints.length > state.maxPoints) {
        state.carrierPhasePoints.splice(
          0,
          state.carrierPhasePoints.length - state.maxPoints,
        );
      }
    },
  },
});

export const {
  addPllPoints,
  addSnrPoints,
  addCarrierPhasePoints,
  resetRapha,
  trimToLast60s,
} = raphaSlice.actions;
export default raphaSlice.reducer;
