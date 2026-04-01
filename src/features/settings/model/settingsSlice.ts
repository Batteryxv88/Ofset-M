import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getSettings } from '../api/getSettings';
import { updateSetting } from '../api/updateSetting';
import type { AppSettings, SettingKey } from './types';
import { DEFAULT_SETTINGS } from './types';

type SettingsState = {
  values: AppSettings;
  loaded: boolean;
};

const initialState: SettingsState = {
  values: DEFAULT_SETTINGS,
  loaded: false,
};

export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  return await getSettings();
});

export const saveSetting = createAsyncThunk(
  'settings/save',
  async (payload: { key: SettingKey; value: number }) => {
    await updateSetting(payload.key, payload.value);
    return payload;
  },
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.fulfilled, (state, action) => {
        for (const s of action.payload) {
          if (s.key in state.values) {
            (state.values as Record<string, number>)[s.key] = s.value;
          }
        }
        state.loaded = true;
      })
      .addCase(saveSetting.fulfilled, (state, action) => {
        const { key, value } = action.payload;
        (state.values as Record<string, number>)[key] = value;
      });
  },
});

export const settingsReducer = settingsSlice.reducer;
