import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  password: string; // In-memory only, not persisted
}

const initialState: AuthState = {
  isAuthenticated: typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('app_isAuthenticated') === 'true' : false,
  password: import.meta.env.VITE_AUTH_PASSWORD || 'admin', // Default password
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      if (action.payload === state.password) {
        state.isAuthenticated = true;
        try { window.localStorage.setItem('app_isAuthenticated', 'true'); } catch (e) {}
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      try { window.localStorage.removeItem('app_isAuthenticated'); } catch (e) {}
    },
    setPassword: (state, action: PayloadAction<string>) => {
      state.password = action.payload;
    },
  },
});

export const { login, logout, setPassword } = authSlice.actions;
export default authSlice.reducer;
