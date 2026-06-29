import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { pb } from '@/lib/pocketbase';

export type Permission = 'dashboard' | 'stations' | 'presets' | 'decoder';

export interface User {
  id: string;
  username: string;
  avatar: string; // filename — use pb.files.getURL to get full URL
  permission: Permission[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Restore auth from PocketBase's built-in authStore (uses localStorage)
function getInitialState(): AuthState {
  if (pb.authStore.isValid && pb.authStore.record) {
    const record = pb.authStore.record;
    return {
      user: {
        id: record.id,
        username: record.username || '',
        avatar: record.avatar || '',
        permission: (record.permission as Permission[]) || [],
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
  }
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
}

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (
    { username, password }: { username: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const authData = await pb
        .collection('users')
        .authWithPassword(username, password);
      const record = authData.record;
      const user: User = {
        id: record.id,
        username: record.username || '',
        avatar: record.avatar || '',
        permission: (record.permission as Permission[]) || [],
      };
      return user;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.message || error?.message || 'Login failed',
      );
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    logout: (state) => {
      pb.authStore.clear();
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Login failed';
      });
  },
});

// Helper: get avatar URL for a user
export function getUserAvatarUrl(user: User): string | null {
  if (!user.avatar) return null;
  return pb.files.getURL(
    {
      id: user.id,
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
    } as any,
    user.avatar,
  );
}

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
