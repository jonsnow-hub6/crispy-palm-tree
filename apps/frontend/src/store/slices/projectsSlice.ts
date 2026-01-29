import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pb } from '@/lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Project extends RecordModel {
  name: string;
  host: string;
  port: number;
  // Note: These fields don't exist in schema yet - would need migration
  // For now, we'll track them in Redux state only
  lastPacket?: string;
  lastPacketTimestamp?: string;
  lastPacketValid?: boolean;
}

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  tcpConnections: Record<string, boolean>; // projectId -> isConnected
}

const initialState: ProjectsState = {
  projects: [],
  loading: false,
  error: null,
  tcpConnections: {},
};

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async () => {
    const records = await pb.collection('projects').getFullList<Project>({
      sort: '-created',
    });
    return records;
  }
);

export const createProject = createAsyncThunk(
  'projects/create',
  async (data: { id?: string; name: string; host: string; port: number }, { rejectWithValue }) => {
    try {
      // If ID is provided, include it in the create request
      const createData: any = {
        name: data.name,
        host: data.host,
        port: data.port,
      };
      
      if (data.id && data.id.trim() !== '') {
        createData.id = data.id.trim();
      }
      
      const record = await pb.collection('projects').create<Project>(createData);
      return record;
    } catch (error: any) {
      // Log full error for debugging
      console.error('PocketBase create error:', error);
      const errorMessage = error?.response?.message || error?.message || error?.data?.message || 'Failed to create project';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, data }: { id: string; data: Partial<Project> }) => {
    const record = await pb.collection('projects').update<Project>(id, data);
    return record;
  }
);

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id: string) => {
    await pb.collection('projects').delete(id);
    return id;
  }
);

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setTcpConnection: (state, action) => {
      state.tcpConnections[action.payload.projectId] = action.payload.connected;
    },
    updatePacketData: (state, action) => {
      const project = state.projects.find(p => p.id === action.payload.projectId);
      if (project) {
        project.lastPacket = action.payload.packet;
        project.lastPacketTimestamp = action.payload.timestamp;
        project.lastPacketValid = action.payload.valid;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch projects';
      })
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to create project';
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload);
        delete state.tcpConnections[action.payload];
      });
  },
});

export const { setTcpConnection, updatePacketData } = projectsSlice.actions;
export default projectsSlice.reducer;
