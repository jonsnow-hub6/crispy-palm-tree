import { createSlice } from '@reduxjs/toolkit';

interface SystemState {
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: number | null;
  packetValidationWindow: number; // 30 seconds in ms
}

const initialState: SystemState = {
  healthStatus: 'unknown',
  lastHealthCheck: null,
  packetValidationWindow: 30000, // 30 seconds
};

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    updateHealthStatus: (state, action) => {
      state.healthStatus = action.payload.status;
      state.lastHealthCheck = action.payload.timestamp || Date.now();
    },
  },
});

export const { updateHealthStatus } = systemSlice.actions;
export default systemSlice.reducer;
