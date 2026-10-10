// ============================================
// Fundly.id — Auth page helpers
// ============================================

import type { OAuthProvider } from '../../stores/authStore';

const ALL_PROVIDERS: OAuthProvider[] = ['google', 'facebook', 'apple'];

/**
 * Provider OAuth yang ditampilkan di halaman login.
 * Atur lewat VITE_AUTH_PROVIDERS="google,facebook,apple" (default: google).
 * Isi dengan "none" untuk menyembunyikan semua tombol login sosial.
 */
export function enabledOAuthProviders(): OAuthProvider[] {
  const raw = (import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) ?? 'google';
  return raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is OAuthProvider => (ALL_PROVIDERS as string[]).includes(p));
}

/**
 * Baca error autentikasi dari URL (mis. tautan email kedaluwarsa / OAuth gagal),
 * lalu bersihkan URL. Mengembalikan pesan bahasa Indonesia atau null.
 */
export function readAuthUrlError(): string | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = search.get('error_code') || hash.get('error_code');
  const desc = search.get('error_description') || hash.get('error_description');
  if (!code && !desc) return null;

  window.history.replaceState({}, document.title, window.location.pathname);

  const text = decodeURIComponent((desc || '').replace(/\+/g, ' '));
  if (code === 'otp_expired' || /expired|invalid/i.test(text)) {
    return 'Tautan sudah kedaluwarsa atau tidak valid. Silakan minta tautan baru.';
  }
  if (/exchange external code/i.test(text)) {
    return 'Login sosial gagal: konfigurasi provider di Supabase belum sesuai.';
  }
  if (/access_denied/i.test(code || '') || /denied/i.test(text)) {
    return 'Akses login dibatalkan.';
  }
  return `Autentikasi gagal: ${text || code}`;
}
