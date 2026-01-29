import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  password: string; // In-memory only, not persisted
}

const initialState: AuthState = {
  isAuthenticated: false,
  password: import.meta.env.VITE_AUTH_PASSWORD || 'admin', // Default password
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      if (action.payload === state.password) {
        state.isAuthenticated = true;
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
    },
    setPassword: (state, action: PayloadAction<string>) => {
      state.password = action.payload;
    },
  },
});

export const { login, logout, setPassword } = authSlice.actions;
export default authSlice.reducer;
