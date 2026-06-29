import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pb } from '@/lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Action extends RecordModel {
  payload: string;
  project: string;
}

export interface Preset extends RecordModel {
  name: string;
  color: string;
  expand?: {
    actions?: Action[];
  };
  active: boolean;
  passwordRequired: boolean;
}

interface PresetsState {
  presets: Preset[];
  loading: boolean;
  error: string | null;
  activePresetId: string | null;
}

const initialState: PresetsState = {
  presets: [],
  loading: false,
  error: null,
  activePresetId: null,
};

export const fetchPresets = createAsyncThunk('presets/fetchAll', async () => {
  const records = await pb.collection('presets').getFullList<Preset>({
    expand: 'actions',
    sort: '-created',
  });
  return records;
});

export const createPreset = createAsyncThunk(
  'presets/create',
  async (
    data: { name: string; color: string; actions?: string[] },
    { rejectWithValue },
  ) => {
    try {
      const record = await pb
        .collection('presets')
        .create<Preset>({ ...data, passwordRequired: true });
      return record;
    } catch (error: any) {
      console.error('PocketBase create preset error:', error);
      const errorMessage =
        error?.response?.message ||
        error?.message ||
        error?.data?.message ||
        'Failed to create preset';
      return rejectWithValue(errorMessage);
    }
  },
);

export const updatePreset = createAsyncThunk(
  'presets/update',
  async ({ id, data }: { id: string; data: Partial<Preset> }) => {
    const record = await pb.collection('presets').update<Preset>(id, data);
    return record;
  },
);

export const deletePreset = createAsyncThunk(
  'presets/delete',
  async (id: string) => {
    await pb.collection('presets').delete(id);
    return id;
  },
);

export const importPresetFromJson = createAsyncThunk(
  'presets/importFromJson',
  async (
    jsonData: {
      presetName: string;
      commands: Array<{ id: string; payload: string }>;
      color: string;
    },
    { rejectWithValue },
  ) => {
    try {
      // First: create or find actions for each command, collecting IDs
      const actionIds: string[] = [];
      const errors: string[] = [];

      for (const command of jsonData.commands) {
        const projectId = command.id;
        const payload = command.payload;

        // Check if action already exists
        try {
          // const existingActions = await pb.collection('actions').getFullList({
          //   filter: `payload="${payload}" && project="${projectId}"`,
          // });

          // let actionId: string;
          // if (existingActions.length > 0) {
          //   actionId = existingActions[0].id;
          // } else {
          // Create new action first
          const action = await pb.collection('actions').create({
            payload: String(payload),
            project: projectId,
          });
          const actionId = action.id;
          // }

          actionIds.push(actionId);
        } catch (error: any) {
          const errorMsg = `Failed to create action for project ${projectId}: ${error?.message || 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Then: create the preset linking to the collected actions
      const presetCreateData: any = {
        name: jsonData.presetName,
        color: jsonData.color,
        passwordRequired: true,
      };

      if (actionIds.length > 0) {
        presetCreateData.actions = actionIds;
      }

      const preset = await pb
        .collection('presets')
        .create<Preset>(presetCreateData);

      // Fetch the complete preset with expanded actions
      const completePreset = await pb
        .collection('presets')
        .getOne<Preset>(preset.id, {
          expand: 'actions',
        });

      if (errors.length > 0) {
        console.warn('Preset import completed with warnings:', errors);
      }

      return completePreset;
    } catch (error: any) {
      console.error('PocketBase import preset error:', error);
      const errorMessage =
        error?.response?.message ||
        error?.message ||
        error?.data?.message ||
        'Failed to import preset';
      return rejectWithValue(errorMessage);
    }
  },
);

const presetsSlice = createSlice({
  name: 'presets',
  initialState,
  reducers: {
    setActivePreset: (state, action) => {
      state.activePresetId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPresets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPresets.fulfilled, (state, action) => {
        state.loading = false;
        state.presets = action.payload;

        // ✅ Get active preset from PB
        const actives = action.payload.filter((p) => p.active === true);

        if (actives.length > 0) {
          // Prefer DB state
          state.activePresetId = actives[0].id;
        } else {
          // Fallback: none active in DB
          state.activePresetId = null;
        }

        // Optional safety warning
        if (actives.length > 1) {
          console.warn('Multiple active presets in DB:', actives);
        }
      })

      .addCase(fetchPresets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch presets';
      })
      .addCase(createPreset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPreset.fulfilled, (state, action) => {
        state.loading = false;
        state.presets.push(action.payload);
      })
      .addCase(createPreset.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to create preset';
      })
      .addCase(updatePreset.fulfilled, (state, action) => {
        const index = state.presets.findIndex(
          (p) => p.id === action.payload.id,
        );
        if (index !== -1) {
          state.presets[index] = action.payload;
        }
      })
      .addCase(deletePreset.fulfilled, (state, action) => {
        state.presets = state.presets.filter((p) => p.id !== action.payload);
        if (state.activePresetId === action.payload) {
          state.activePresetId = null;
        }
      })
      .addCase(importPresetFromJson.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(importPresetFromJson.fulfilled, (state, action) => {
        state.loading = false;
        state.presets.push(action.payload);
      })
      .addCase(importPresetFromJson.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to import preset';
      });
  },
});

export const { setActivePreset } = presetsSlice.actions;
export default presetsSlice.reducer;
