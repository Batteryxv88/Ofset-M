import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth';
import { settingsReducer } from '../features/settings';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
