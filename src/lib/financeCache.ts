// ============================================
// Fundly.id - Cache data keuangan di perangkat (stale-while-revalidate)
// Data terakhir ditampilkan instan saat aplikasi dibuka, lalu diperbarui dari server.
// Disimpan per-user, mengikuti pilihan "Ingat Saya", dan dihapus saat logout.
// ============================================

import type { Account, Budget, Category, Goal, RecurringTemplate, Transaction } from '../types/models';
import { shouldRemember } from './supabase';

const CACHE_VERSION = 1;
const KEY_PREFIX = 'fundly-cache:';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
const MAX_BYTES = 4 * 1024 * 1024; // batas aman kuota localStorage

export interface FinanceSnapshot {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurring: RecurringTemplate[];
}

interface StoredSnapshot extends FinanceSnapshot {
  v: number;
  savedAt: number;
}

const keyFor = (userId: string) => `${KEY_PREFIX}${userId}`;

function areas(): Storage[] {
  try {
    return [localStorage, sessionStorage];
  } catch {
    return [];
  }
}

/** Sesi "Ingat Saya" → localStorage; sesi sementara → sessionStorage (hilang saat browser ditutup). */
function preferredArea(): Storage | null {
  try {
    return shouldRemember() ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

export function readFinanceCache(userId: string): FinanceSnapshot | null {
  for (const area of areas()) {
    try {
      const raw = area.getItem(keyFor(userId));
      if (!raw) continue;
      const data = JSON.parse(raw) as StoredSnapshot;
      if (data.v !== CACHE_VERSION || Date.now() - data.savedAt > MAX_AGE_MS) {
        area.removeItem(keyFor(userId));
        continue;
      }
      return {
        accounts: data.accounts ?? [],
        categories: data.categories ?? [],
        transactions: data.transactions ?? [],
        budgets: data.budgets ?? [],
        goals: data.goals ?? [],
        recurring: data.recurring ?? [],
      };
    } catch {
      // cache rusak → abaikan
    }
  }
  return null;
}

export function writeFinanceCache(userId: string, snapshot: FinanceSnapshot): void {
  const area = preferredArea();
  if (!area) return;
  try {
    const payload = JSON.stringify({ v: CACHE_VERSION, savedAt: Date.now(), ...snapshot } satisfies StoredSnapshot);
    // Data sangat besar tidak di-cache agar tidak memenuhi kuota penyimpanan
    if (payload.length > MAX_BYTES) {
      area.removeItem(keyFor(userId));
      return;
    }
    area.setItem(keyFor(userId), payload);
    // Pastikan tidak ada salinan di area penyimpanan lain
    for (const other of areas()) if (other !== area) other.removeItem(keyFor(userId));
  } catch {
    try {
      area.removeItem(keyFor(userId));
    } catch {
      // abaikan
    }
  }
}

/** Hapus cache satu user, atau semua cache Fundly jika userId tidak diberikan. */
export function clearFinanceCache(userId?: string): void {
  for (const area of areas()) {
    try {
      if (userId) {
        area.removeItem(keyFor(userId));
        continue;
      }
      for (let i = area.length - 1; i >= 0; i--) {
        const key = area.key(i);
        if (key?.startsWith(KEY_PREFIX)) area.removeItem(key);
      }
    } catch {
      // abaikan
    }
  }
}
