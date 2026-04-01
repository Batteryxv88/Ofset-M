export type User = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
};

export type AuthState = {
  user: User | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
};
