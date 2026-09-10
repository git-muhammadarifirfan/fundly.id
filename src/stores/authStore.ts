// ============================================
// Fundly.id — Auth State Store (Zustand)
// ============================================

import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: null, session: null, profile: null, isAuthenticated: false }),
}));
