import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { pb } from '@/lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface StationLink {
  host: string;
  port: number;
  active: boolean;
  counter: number;
  reachable: boolean;
}

export interface Station extends RecordModel {
  name: string;
  stationLinks: StationLink[];
}

interface StationsState {
  stations: Station[];
  loading: boolean;
  error: string | null;
  activeStationId: string | null;
}

const initialState: StationsState = {
  stations: [],
  loading: false,
  error: null,
  activeStationId: null,
};

// Async thunks
export const fetchStations = createAsyncThunk('stations/fetchAll', async () => {
  const records = await pb.collection('stations').getFullList<Station>({
    sort: '-created',
  });
  return records;
});

export const createStation = createAsyncThunk(
  'stations/create',
  async (data: { name: string; stationLinks: StationLink[] }) => {
    const record = await pb.collection('stations').create<Station>(data);
    return record;
  },
);

export const updateStation = createAsyncThunk(
  'stations/update',
  async ({ id, data }: { id: string; data: Partial<Station> }) => {
    const record = await pb.collection('stations').update<Station>(id, data);
    return record;
  },
);

export const deleteStation = createAsyncThunk(
  'stations/delete',
  async (id: string) => {
    await pb.collection('stations').delete(id);
    return id;
  },
);

export const activateStation = createAsyncThunk(
  'stations/activate',
  async ({ stationId }: { stationId: string }, thunkAPI) => {
    // Call backend activation endpoint which is the source-of-truth
    try {
      await pb.send(`/api/stations/${stationId}/activate`, {
        method: 'POST',
      });
    } catch (err: any) {
      console.error('Failed to activate station:', err);
      return thunkAPI.rejectWithValue({ error: err?.message || String(err) });
    }

    // Refresh stations from the server to reflect backend-driven state
    await thunkAPI.dispatch(fetchStations());

    // Return updated station record to satisfy reducers (fetchStations will update full list)
    const updated = await pb.collection('stations').getOne<Station>(stationId);
    return updated;
  },
);

export const activateStationLink = createAsyncThunk(
  'stations/activateLink',
  async (
    { stationId, host, port }: { stationId: string; host: string; port: number },
    thunkAPI,
  ) => {
    try {
      await pb.send(`/api/stations/${stationId}/activate-link`, {
        method: 'POST',
        body: { host, port },
      });
    } catch (err: any) {
      console.error('Failed to activate specific station link:', err);
      return thunkAPI.rejectWithValue({ error: err?.message || String(err) });
    }

    await thunkAPI.dispatch(fetchStations());

    const updated = await pb.collection('stations').getOne<Station>(stationId);
    return updated;
  },
);

export const deactivateStation = createAsyncThunk(
  'stations/deactivate',
  async ({ stationId }: { stationId: string }, thunkAPI) => {
    // Call backend activation endpoint which is the source-of-truth
    try {
      await pb.send(`/api/stations/${stationId}/deactivate`, {
        method: 'POST',
      });
    } catch (err: any) {
      console.error('Failed to deactivate station:', err);
      return thunkAPI.rejectWithValue({ error: err?.message || String(err) });
    }

    // Refresh stations from the server to reflect backend-driven state
    await thunkAPI.dispatch(fetchStations());

    // Return updated station record to satisfy reducers (fetchStations will update full list)
    const updated = await pb.collection('stations').getOne<Station>(stationId);
    return updated;
  },
);

const stationsSlice = createSlice({
  name: 'stations',
  initialState,
  reducers: {
    setActiveStation: (state, action: PayloadAction<string | null>) => {
      state.activeStationId = action.payload;
    },
    upsertStation: (state, action: PayloadAction<Station>) => {
      const idx = state.stations.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) state.stations[idx] = action.payload;
      else state.stations.push(action.payload);
      // recompute active station
      const active = state.stations.find((s) =>
        s.stationLinks.some((l) => l.active),
      );
      state.activeStationId = active?.id || null;
    },
    removeStation: (state, action: PayloadAction<string>) => {
      state.stations = state.stations.filter((s) => s.id !== action.payload);
      if (state.activeStationId === action.payload)
        state.activeStationId = null;
    },
    updateStationLinkCounter: (
      state,
      action: PayloadAction<{
        stationId: string;
        linkIndex: number;
        counter: number;
      }>,
    ) => {
      const station = state.stations.find(
        (s) => s.id === action.payload.stationId,
      );
      if (station) {
        station.stationLinks[action.payload.linkIndex].counter =
          action.payload.counter;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStations.fulfilled, (state, action) => {
        state.loading = false;
        state.stations = action.payload;
        // Find active station
        const activeStation = action.payload.find((s) =>
          s.stationLinks.some((link) => link.active),
        );
        state.activeStationId = activeStation?.id || null;
      })
      .addCase(fetchStations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stations';
      })
      .addCase(createStation.fulfilled, (state, action) => {
        const idx = state.stations.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) {
          state.stations[idx] = action.payload;
        } else {
          state.stations.push(action.payload);
        }
      })
      .addCase(updateStation.fulfilled, (state, action) => {
        const index = state.stations.findIndex(
          (s) => s.id === action.payload.id,
        );
        if (index !== -1) {
          state.stations[index] = action.payload;
        }
        // Update active station if needed
        const hasActiveLink = action.payload.stationLinks.some(
          (link) => link.active,
        );
        if (hasActiveLink) {
          state.activeStationId = action.payload.id;
        } else if (state.activeStationId === action.payload.id) {
          state.activeStationId = null;
        }
      })
      .addCase(deleteStation.fulfilled, (state, action) => {
        state.stations = state.stations.filter((s) => s.id !== action.payload);
        if (state.activeStationId === action.payload) {
          state.activeStationId = null;
        }
      })
      .addCase(activateStation.fulfilled, (state, action) => {
        const index = state.stations.findIndex(
          (s) => s.id === action.payload.id,
        );
        if (index !== -1) {
          state.stations[index] = action.payload;
        }
        // Update all stations to reflect deactivation for others
        state.stations = state.stations.map((s) => {
          if (s.id === action.payload.id) {
            return action.payload;
          }
          return {
            ...s,
            stationLinks: s.stationLinks.map((link) => ({
              ...link,
              active: false,
            })),
          } as Station;
        });
        state.activeStationId = action.payload.id;
      })
      .addCase(activateStationLink.fulfilled, (state, action) => {
        const index = state.stations.findIndex(
          (s) => s.id === action.payload.id,
        );
        if (index !== -1) {
          state.stations[index] = action.payload;
        }
        // Update all stations to reflect deactivation for others
        state.stations = state.stations.map((s) => {
          if (s.id === action.payload.id) {
            return action.payload;
          }
          return {
            ...s,
            stationLinks: s.stationLinks.map((link) => ({
              ...link,
              active: false,
            })),
          } as Station;
        });
        state.activeStationId = action.payload.id;
      })
      .addCase(deactivateStation.fulfilled, (state, action) => {
        const station = state.stations.find(
          (s) => s.id === action.payload.stationId,
        );

        if (station) {
          station.stationLinks.forEach((l) => {
            l.active = false;
          });
        }
      });
  },
});

export const {
  setActiveStation,
  updateStationLinkCounter,
  upsertStation,
  removeStation,
} = stationsSlice.actions;
export default stationsSlice.reducer;
