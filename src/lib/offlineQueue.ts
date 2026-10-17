// ============================================
// Fundly.id - Antrian transaksi offline
// Saat tidak ada internet, tambah/edit/hapus transaksi disimpan di perangkat,
// lalu dikirim ke database secara berurutan begitu online kembali.
// ============================================

import type { Account, Transaction, TransactionInput } from '../types/models';

export type QueuedOp =
  | { kind: 'create'; id: string; input: TransactionInput; queuedAt: number }
  | { kind: 'update'; id: string; input: TransactionInput; queuedAt: number }
  | { kind: 'delete'; id: string; queuedAt: number };

const KEY_PREFIX = 'fundly-offline-queue:';
const keyFor = (userId: string) => `${KEY_PREFIX}${userId}`;

export function readQueue(userId: string): QueuedOp[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as QueuedOp[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(userId: string, ops: QueuedOp[]) {
  try {
    if (ops.length) localStorage.setItem(keyFor(userId), JSON.stringify(ops));
    else localStorage.removeItem(keyFor(userId));
  } catch {
    // kuota penuh / storage diblokir: antrian tetap ada di memori sampai halaman ditutup
  }
  queueListeners.forEach((fn) => fn(ops.length));
}

/**
 * Tambahkan operasi ke antrian dengan penggabungan:
 * - edit/hapus transaksi yang belum terkirim cukup mengubah/membuang operasi "create"-nya
 * - beberapa edit pada transaksi yang sama digabung menjadi satu
 */
export function enqueue(userId: string, op: QueuedOp): void {
  const ops = readQueue(userId);
  const pendingCreate = ops.find((o) => o.kind === 'create' && o.id === op.id);

  if (op.kind === 'update' && pendingCreate && pendingCreate.kind === 'create') {
    pendingCreate.input = op.input;
    writeQueue(userId, ops);
    return;
  }
  if (op.kind === 'delete' && pendingCreate) {
    writeQueue(
      userId,
      ops.filter((o) => o.id !== op.id),
    );
    return;
  }
  const rest = op.kind === 'create' ? ops : ops.filter((o) => !(o.id === op.id && o.kind === 'update'));
  rest.push(op);
  writeQueue(userId, rest);
}

export function removeOp(userId: string, op: QueuedOp): void {
  writeQueue(
    userId,
    readQueue(userId).filter((o) => !(o.id === op.id && o.kind === op.kind && o.queuedAt === op.queuedAt)),
  );
}

export function pendingIds(userId: string): Set<string> {
  return new Set(readQueue(userId).filter((o) => o.kind !== 'delete').map((o) => o.id));
}

// ---- Listener jumlah antrian (untuk indikator UI) ----
const queueListeners = new Set<(count: number) => void>();
export function onQueueChange(fn: (count: number) => void): () => void {
  queueListeners.add(fn);
  return () => queueListeners.delete(fn);
}

// ---- Helper data lokal ----

/** Buat UUID v4 di perangkat (dipakai sebagai id transaksi agar tidak dobel saat dikirim ulang) */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function buildLocalTransaction(id: string, userId: string, input: TransactionInput, base?: Transaction): Transaction {
  const now = new Date().toISOString();
  return {
    id,
    user_id: userId,
    recurring_id: base?.recurring_id ?? null,
    location: base?.location ?? null,
    receipt_url: base?.receipt_url ?? null,
    note: input.note ?? null,
    type: input.type,
    amount: input.amount,
    account_id: input.account_id,
    to_account_id: input.type === 'transfer' ? input.to_account_id ?? null : null,
    category_id: input.type === 'transfer' ? null : input.category_id ?? null,
    status: input.status ?? 'cleared',
    transaction_date: input.transaction_date,
    transaction_time: input.transaction_time,
    created_at: base?.created_at ?? now,
    updated_at: now,
  };
}

/** Efek sebuah transaksi terhadap saldo akun (sama dengan trigger database) */
function balanceEffects(tx: Pick<Transaction, 'type' | 'amount' | 'account_id' | 'to_account_id' | 'status'>): [string, number][] {
  if (tx.status !== 'cleared') return [];
  if (tx.type === 'income') return [[tx.account_id, tx.amount]];
  if (tx.type === 'expense') return [[tx.account_id, -tx.amount]];
  return tx.to_account_id ? [[tx.account_id, -tx.amount], [tx.to_account_id, tx.amount]] : [[tx.account_id, -tx.amount]];
}

/** Perbarui saldo akun secara lokal: batalkan efek transaksi lama, terapkan efek yang baru */
export function adjustBalances(accounts: Account[], before: Transaction | null, after: Transaction | null): Account[] {
  const delta = new Map<string, number>();
  if (before) for (const [id, v] of balanceEffects(before)) delta.set(id, (delta.get(id) || 0) - v);
  if (after) for (const [id, v] of balanceEffects(after)) delta.set(id, (delta.get(id) || 0) + v);
  if (![...delta.values()].some(Boolean)) return accounts;
  return accounts.map((a) => (delta.get(a.id) ? { ...a, balance: a.balance + (delta.get(a.id) as number) } : a));
}

/** Kesalahan jaringan (offline / server tidak terjangkau) → aman untuk dicoba lagi nanti */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('tidak dapat terhubung') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('timeout')
  );
}
