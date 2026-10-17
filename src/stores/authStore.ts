// ============================================
// Fundly.id - Auth State Store (Zustand + Supabase Auth)
// ============================================

import { create } from 'zustand';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  openedFromRecoveryLink,
  readStoredSession,
  setRememberSession,
  supabase,
  toFriendlyError,
} from '../lib/supabase';
import { profileApi } from '../services/financeApi';
import { clearFinanceCache } from '../lib/financeCache';
import type { Profile } from '../types/models';

export type { Profile } from '../types/models';

export type OAuthProvider = 'google' | 'facebook' | 'apple';

interface AuthResult {
  error: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;

  initAuth: () => void;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) => Promise<Profile>;

  loginWithEmail: (email: string, password: string, remember?: boolean) => Promise<AuthResult>;
  registerWithEmail: (email: string, password: string, fullName: string) => Promise<AuthResult & { needsConfirmation: boolean }>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  loginWithOAuth: (provider: OAuthProvider) => Promise<AuthResult>;
  requestResetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  updateEmail: (newEmail: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

/** Terjemahkan pesan error Supabase Auth ke bahasa Indonesia */
export function translateAuthError(error: AuthError | Error | string | null | undefined): string {
  const raw = typeof error === 'string' ? error : error?.message || '';
  const msg = raw.toLowerCase();
  const status = typeof error === 'object' && error ? (error as { status?: number }).status : undefined;
  const name = typeof error === 'object' && error ? (error as { name?: string }).name || '' : '';

  // Server auth/email tidak merespons (504) atau request dihentikan karena timeout
  if (
    status === 504 ||
    status === 502 ||
    /timeout|aborted|aborterror/i.test(name) ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('signal is aborted')
  ) {
    console.warn('[Fundly] Request auth timeout / gateway error:', status, raw || name);
    return 'Server sedang tidak merespons saat mengirim email verifikasi. Silakan coba lagi beberapa saat lagi.';
  }
  if (!raw) return 'Terjadi kesalahan autentikasi.';
  if (msg.includes('invalid login credentials')) return 'Email atau kata sandi salah. Silakan periksa kembali.';
  if (msg.includes('email not confirmed')) return 'Email Anda belum dikonfirmasi. Silakan cek inbox (atau folder spam) Anda.';
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk atau gunakan Lupa Password.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password') || msg.includes('password is too weak')) {
    return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.';
  }
  if (msg.includes('same as the old password') || msg.includes('should be different')) {
    return 'Kata sandi baru harus berbeda dari kata sandi lama.';
  }
  if (
    msg.includes('error sending') ||
    msg.includes('smtp') ||
    msg.includes('upstream request timeout') ||
    msg.includes('gateway timeout') ||
    msg.includes('unexpected_failure')
  ) {
    console.warn('[Fundly] Pengiriman email auth gagal:', raw);
    return 'Email tidak dapat dikirim saat ini karena server email sedang bermasalah. Silakan coba lagi beberapa saat lagi.';
  }
  if (msg.includes('email rate limit')) {
    return 'Batas pengiriman email tercapai. Silakan tunggu sekitar 1 jam lalu coba lagi.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('security purposes')) {
    return 'Terlalu banyak percobaan. Silakan tunggu beberapa saat lalu coba lagi.';
  }
  if (msg.includes('unable to validate email') || msg.includes('invalid email') || msg.includes('email address') && msg.includes('invalid')) {
    return 'Format alamat email tidak valid.';
  }
  if (msg.includes('auth session missing') || msg.includes('session not found') || msg.includes('jwt expired')) {
    return 'Sesi telah berakhir atau tautan sudah kedaluwarsa. Silakan ulangi prosesnya.';
  }
  if (msg.includes('provider is not enabled') || msg.includes('unsupported provider')) {
    return 'Metode login ini belum diaktifkan oleh administrator.';
  }
  if (msg.includes('signups not allowed') || msg.includes('signup is disabled')) {
    return 'Pendaftaran akun baru sedang dinonaktifkan.';
  }
  if (msg.includes('email change') && msg.includes('same')) return 'Email baru sama dengan email saat ini.';
  return toFriendlyError(raw);
}

/** Validasi kekuatan password. Mengembalikan pesan error atau null jika valid. */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Kata sandi harus mengandung huruf dan angka.';
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

const NOT_CONFIGURED = 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.';

const appUrl = (path: string) => `${window.location.origin}${path}`;

function profileFromUser(user: User): Profile {
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Pengguna Fundly',
    avatar_url: meta.avatar_url || meta.picture || null,
    currency: 'IDR',
  };
}

let initialized = false;

export const useAuthStore = create<AuthState>((set, get) => {
  const loadProfile = async (user: User) => {
    try {
      let profile = await profileApi.get(user.id);
      if (!profile) {
        // User lama yang belum punya profil
        await supabase.rpc('ensure_user_setup');
        profile = await profileApi.get(user.id);
      }
      if (get().user?.id === user.id) set({ profile: profile ?? profileFromUser(user) });
    } catch (err) {
      console.warn('[Fundly] Gagal memuat profil:', err);
      if (get().user?.id === user.id && !get().profile) set({ profile: profileFromUser(user) });
    }
  };

  const applySession = (session: Session | null) => {
    const prevUserId = get().user?.id;
    if (session?.user) {
      set({ session, user: session.user, isAuthenticated: true });
      if (prevUserId !== session.user.id) {
        set({ profile: profileFromUser(session.user) });
        // Jangan memanggil Supabase langsung di dalam callback auth (hindari deadlock)
        setTimeout(() => void loadProfile(session.user), 0);
      }
    } else {
      // Logout (termasuk dari tab lain) → hapus cache data keuangan di perangkat ini
      if (prevUserId) clearFinanceCache(prevUserId);
      set({ session: null, user: null, profile: null, isAuthenticated: false, isPasswordRecovery: false });
    }
  };

  return {
    user: null,
    session: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
    isPasswordRecovery: openedFromRecoveryLink,

    initAuth: () => {
      if (initialized) return;
      initialized = true;

      if (!isSupabaseConfigured) {
        set({ isLoading: false });
        return;
      }

      // Mode offline: Supabase bisa mencoba memperbarui token hingga ±30 detik.
      // Pakai sesi tersimpan agar aplikasi langsung terbuka dengan data di perangkat.
      const applyStoredSession = () => {
        const stored = readStoredSession();
        if (!stored || get().user) return false;
        applySession(stored);
        set({ isLoading: false });
        return true;
      };
      if (typeof navigator !== 'undefined' && navigator.onLine === false) applyStoredSession();

      // Pengaman: jangan biarkan layar loading selamanya (koneksi lambat / tanpa internet)
      const quickFallback = setTimeout(() => applyStoredSession(), 3000);
      const fallback = setTimeout(() => {
        if (!applyStoredSession()) set({ isLoading: false });
      }, 8000);

      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') set({ isPasswordRecovery: true });
        // Offline + token kedaluwarsa: Supabase belum bisa memperbarui sesi, tapi sesi
        // tersimpan masih ada → tetap masuk (mode offline). Token diperbarui otomatis saat online.
        if (event === 'INITIAL_SESSION' && !session) {
          const stored = readStoredSession();
          if (stored) {
            applySession(stored);
            clearTimeout(fallback);
            clearTimeout(quickFallback);
            set({ isLoading: false });
            return;
          }
        }
        applySession(session);
        if (event === 'INITIAL_SESSION') {
          clearTimeout(fallback);
          clearTimeout(quickFallback);
          set({ isLoading: false });
        }
      });
    },

    setProfile: (profile) => set({ profile }),

    refreshProfile: async () => {
      const user = get().user;
      if (user) await loadProfile(user);
    },

    updateProfile: async (patch) => {
      const user = get().user;
      if (!user) throw new Error('Sesi tidak valid. Silakan masuk kembali.');
      const profile = await profileApi.update(user.id, patch);
      set({ profile });
      if (patch.full_name !== undefined) {
        // Sinkronkan juga ke metadata auth (dipakai saat profil belum termuat)
        void supabase.auth.updateUser({ data: { full_name: patch.full_name } });
      }
      return profile;
    },

    loginWithEmail: async (email, password, remember = true) => {
      if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
      setRememberSession(remember);
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { error: translateAuthError(error) };
      applySession(data.session);
      return { error: null };
    },

    registerWithEmail: async (email, password, fullName) => {
      if (!isSupabaseConfigured) return { error: NOT_CONFIGURED, needsConfirmation: false };
      setRememberSession(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: appUrl('/login'),
        },
      });
      if (error) return { error: translateAuthError(error), needsConfirmation: false };

      // Jika konfirmasi email aktif & email sudah terdaftar, Supabase mengembalikan user tanpa identitas
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { error: translateAuthError('User already registered'), needsConfirmation: false };
      }

      if (data.session) {
        applySession(data.session);
        return { error: null, needsConfirmation: false };
      }
      return { error: null, needsConfirmation: true };
    },

    resendConfirmation: async (email) => {
      if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: appUrl('/login') },
      });
      return { error: error ? translateAuthError(error) : null };
    },

    loginWithOAuth: async (provider) => {
      if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
      setRememberSession(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: appUrl('/') },
      });
      return { error: error ? translateAuthError(error) : null };
    },

    requestResetPassword: async (email) => {
      if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: appUrl('/reset-password-confirm'),
      });
      return { error: error ? translateAuthError(error) : null };
    },

    updatePassword: async (newPassword) => {
      if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: translateAuthError(error) };
      set({ isPasswordRecovery: false });
      return { error: null };
    },

    updateEmail: async (newEmail) => {
      if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
      const { error } = await supabase.auth.updateUser(
        { email: newEmail.trim() },
        { emailRedirectTo: appUrl('/settings') },
      );
      return { error: error ? translateAuthError(error) : null };
    },

    logout: async () => {
      try {
        if (isSupabaseConfigured) await supabase.auth.signOut({ scope: 'local' });
      } catch (err) {
        console.warn('[Fundly] Gagal logout dari server:', err);
      } finally {
        clearFinanceCache();
        set({ user: null, session: null, profile: null, isAuthenticated: false, isPasswordRecovery: false });
      }
    },
  };
});
