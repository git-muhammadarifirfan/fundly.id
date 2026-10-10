// ============================================
// Fundly.id — Supabase Client Configuration
// ============================================

import { createClient, type SupportedStorage } from '@supabase/supabase-js';

// VITE_* diutamakan; NEXT_PUBLIC_* sebagai cadangan dari integrasi Supabase di Vercel
const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('your_supabase'),
);

/**
 * Deteksi tautan reset password SEBELUM klien Supabase memproses & membersihkan URL,
 * agar status recovery tidak terlewat walau event PASSWORD_RECOVERY terjadi lebih awal.
 */
export const openedFromRecoveryLink =
  typeof window !== 'undefined' && /(^|[#&?])type=recovery(&|$)/.test(`${window.location.hash}&${window.location.search}`);

// ---- "Ingat Saya" session storage ----
// Jika user tidak mencentang "Ingat Saya", sesi disimpan di sessionStorage
// (hilang saat browser ditutup). Jika dicentang, disimpan di localStorage.
const REMEMBER_KEY = 'fundly-remember-session';

export function setRememberSession(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    // storage tidak tersedia (mode privat) — abaikan
  }
}

function shouldRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
}

const authStorage: SupportedStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      if (shouldRemember()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      // abaikan
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // abaikan
    }
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: authStorage,
      storageKey: 'fundly-auth',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  },
);

/** Ubah error Supabase/PostgREST menjadi pesan bahasa Indonesia yang ramah. */
export function toFriendlyError(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (!error) return fallback;
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';
  const msg = raw.toLowerCase();

  if (!raw) return fallback;
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  }
  if (msg.includes('jwt expired') || msg.includes('invalid jwt')) {
    return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
  }
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
  }
  if (msg.includes('duplicate key') && msg.includes('budgets')) {
    return 'Anggaran untuk kategori ini pada periode tersebut sudah ada.';
  }
  if (msg.includes('duplicate key')) return 'Data yang sama sudah ada.';
  if (msg.includes('violates foreign key')) return 'Data terkait tidak ditemukan atau masih digunakan.';
  if (msg.includes('could not find the function') || msg.includes('does not exist')) {
    return 'Skema database belum diperbarui. Jalankan server/schema.sql di Supabase SQL Editor.';
  }
  return raw;
}
