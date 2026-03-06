import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Point = { ts: number; value: number; decoderId?: string };

interface RaphaState {
  pllPoints: Point[];
  dllResults: Point[];
  maxPoints: number;
}

const initialState: RaphaState = {
  pllPoints: [],
  dllResults: [],
  maxPoints: 1200,
};

function pruneInPlace(points: Point[], maxPoints: number) {
  const cutoff = Date.now() - 60_000;

  // Remove old points by time (fast forward removal)
  let removeCount = 0;
  while (removeCount < points.length && points[removeCount].ts < cutoff) {
    removeCount++;
  }

  if (removeCount > 0) {
    points.splice(0, removeCount);
  }

  // Hard cap by size
  if (points.length > maxPoints) {
    points.splice(0, points.length - maxPoints);
  }
}

const raphaSlice = createSlice({
  name: 'rapha',
  initialState,
  reducers: {
    addPllPoints: (state, action: PayloadAction<Point[]>) => {
      for (const p of action.payload) {
        state.pllPoints.push(p);
      }

      pruneInPlace(state.pllPoints, state.maxPoints);
    },

    addDllResults: (state, action: PayloadAction<Point[]>) => {
      for (const p of action.payload) {
        state.dllResults.push(p);
      }

      pruneInPlace(state.dllResults, state.maxPoints);
    },

    resetRapha: (state) => {
      state.pllPoints.length = 0;
      state.dllResults.length = 0;
    },
  },
});

export const { addPllPoints, addDllResults, resetRapha } = raphaSlice.actions;
export default raphaSlice.reducer;