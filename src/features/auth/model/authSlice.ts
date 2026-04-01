import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../../shared/api/supabaseClient';
import type { AuthState, User } from './types';

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async (params: { email: string; password: string }, { rejectWithValue }) => {
    if (!supabase) {
      return rejectWithValue('Supabase не сконфигурирован. Проверь .env.local');
    }
    const { email, password } = params;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return rejectWithValue(error.message);

    return {
      id: data.user?.id ?? '',
      email: data.user?.email ?? null,
      name:
        (data.user?.user_metadata?.name as string | undefined) ??
        (data.user?.user_metadata?.full_name as string | undefined) ??
        null,
      role: null,
    } as User;
  },
);

export const loadProfile = createAsyncThunk(
  'auth/loadProfile',
  async (userId: string, { rejectWithValue }) => {
    if (!supabase) {
      return rejectWithValue('Supabase не сконфигурирован. Проверь .env.local');
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('name, role, email')
      .eq('id', userId)
      .single();

    if (error) return rejectWithValue(error.message);
    return data as { name: string | null; role: string; email: string | null };
  },
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  if (supabase) await supabase.auth.signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInWithEmail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Ошибка авторизации';
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        if (!state.user) return;
        state.user.name = action.payload.name ?? state.user.name;
        state.user.email = action.payload.email ?? state.user.email;
        state.user.role = action.payload.role ?? state.user.role;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
      });
  },
});

export const { setUser } = authSlice.actions;
export const authReducer = authSlice.reducer;
