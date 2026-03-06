import { configureStore } from '@reduxjs/toolkit';
import stationsReducer from './store/slices/stationsSlice';
import projectsReducer from './store/slices/projectsSlice';
import presetsReducer from './store/slices/presetsSlice';
import systemReducer from './store/slices/systemSlice';
import authReducer from './store/slices/authSlice';
import raphaReducer from './store/slices/raphaSlice';

export const store = configureStore({
    reducer: {
        stations: stationsReducer,
        projects: projectsReducer,
        presets: presetsReducer,
        rapha: raphaReducer,
        system: systemReducer,
        auth: authReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
