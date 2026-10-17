// ============================================
// Fundly.id - Finance Data Store (Zustand + Supabase Realtime)
// Satu sumber data untuk seluruh halaman. Perubahan dari perangkat/tab lain
// masuk lewat Supabase Realtime dan langsung memperbarui UI.
// ============================================

import { create } from 'zustand';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  accountApi,
  budgetApi,
  categoryApi,
  goalApi,
  normalizers,
  recurringApi,
  setupApi,
  transactionApi,
} from '../services/financeApi';
import type {
  Account,
  AccountInput,
  Budget,
  BudgetInput,
  Category,
  CategoryInput,
  Goal,
  GoalInput,
  Profile,
  RecurringInput,
  RecurringTemplate,
  Transaction,
  TransactionInput,
} from '../types/models';
import { sortTransactions } from '../utils/finance';
import { getTodayISO } from '../utils/formatDate';
import { useAuthStore } from './authStore';
import { readFinanceCache, writeFinanceCache } from '../lib/financeCache';
import { isLiteMode } from './perfStore';
import toast from 'react-hot-toast';
import {
  adjustBalances,
  buildLocalTransaction,
  enqueue,
  isNetworkError,
  newId,
  onQueueChange,
  readQueue,
  removeOp,
  type QueuedOp,
} from '../lib/offlineQueue';

type DataTable = 'accounts' | 'categories' | 'transactions' | 'budgets' | 'goals' | 'recurring_templates';
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type RealtimeStatus = 'idle' | 'connecting' | 'live' | 'offline';

interface FinanceState {
  userId: string | null;
  status: LoadStatus;
  error: string | null;
  isRefreshing: boolean;
  realtimeStatus: RealtimeStatus;
  lastSyncedAt: number | null;
  /** Jumlah perubahan transaksi yang menunggu dikirim (dibuat saat offline) */
  pendingCount: number;
  isSyncing: boolean;

  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurring: RecurringTemplate[];

  init: (userId: string) => Promise<void>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  refreshTables: (tables: DataTable[]) => Promise<void>;
  reset: () => void;
  /** Kirim antrian transaksi offline ke database (dipanggil otomatis saat online) */
  syncPending: () => Promise<void>;

  // Transactions
  addTransaction: (
    input: TransactionInput,
    recurring?: { frequency: RecurringInput['frequency']; end_date: string | null } | null,
  ) => Promise<Transaction | null>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;

  // Accounts
  addAccount: (input: AccountInput) => Promise<Account>;
  updateAccount: (id: string, patch: Partial<AccountInput>) => Promise<Account>;
  setAccountActive: (id: string, active: boolean) => Promise<Account>;

  // Categories
  addCategory: (input: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<Omit<CategoryInput, 'type'>>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;

  // Budgets
  saveBudget: (input: BudgetInput, id?: string | null) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  copyBudgets: (from: { month: number; year: number }, to: { month: number; year: number }) => Promise<number>;

  // Goals
  addGoal: (input: GoalInput) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<GoalInput>) => Promise<Goal>;
  adjustGoal: (id: string, delta: number) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;

  // Recurring
  setRecurringActive: (id: string, active: boolean) => Promise<RecurringTemplate>;
  deleteRecurring: (id: string) => Promise<void>;
}

const LIST_KEY: Record<DataTable, keyof FinanceState> = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  budgets: 'budgets',
  goals: 'goals',
  recurring_templates: 'recurring',
};

const SORTERS: Partial<Record<DataTable, (rows: never[]) => unknown[]>> = {
  transactions: (rows) => sortTransactions(rows as Transaction[]),
  accounts: (rows) =>
    (rows as Account[]).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
  categories: (rows) =>
    (rows as Category[]).sort(
      (a, b) => a.type.localeCompare(b.type) || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
    ),
  goals: (rows) => (rows as Goal[]).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  recurring_templates: (rows) =>
    (rows as RecurringTemplate[]).sort((a, b) => a.next_run_date.localeCompare(b.next_run_date)),
};

function upsertRow<T extends { id: string }>(list: T[], row: T, table: DataTable): T[] {
  const next = list.slice();
  const idx = next.findIndex((r) => r.id === row.id);
  if (idx >= 0) next[idx] = row;
  else next.push(row);
  const sorter = SORTERS[table];
  return sorter ? (sorter(next as never[]) as T[]) : next;
}

function removeRow<T extends { id: string }>(list: T[], id: string): T[] {
  return list.some((r) => r.id === id) ? list.filter((r) => r.id !== id) : list;
}

// ---- Module-level runtime state (bukan bagian dari state React) ----
let channel: RealtimeChannel | null = null;
let initPromise: Promise<void> | null = null;
let hasSubscribedOnce = false;
let lastRecurringRunDate: string | null = null;
let lifecycleBound = false;
let lastWriteQueued = false;
let syncPromise: Promise<void> | null = null;

const isOfflineNow = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Akhiran pesan sukses jika operasi terakhir disimpan offline */
export const offlineSuffix = () => (lastWriteQueued ? ' (offline, disinkronkan saat online)' : '');

/** Terapkan antrian offline di atas data server (agar transaksi yang belum terkirim tetap tampil) */
function overlayQueue(userId: string, transactions: Transaction[], accounts: Account[]) {
  const ops = readQueue(userId);
  if (!ops.length) return { transactions, accounts };
  let txs = transactions.slice();
  let accs = accounts;
  for (const op of ops) {
    const before = txs.find((t) => t.id === op.id) ?? null;
    if (op.kind === 'delete') {
      if (!before) continue;
      txs = txs.filter((t) => t.id !== op.id);
      accs = adjustBalances(accs, before, null);
      continue;
    }
    if (op.kind === 'create' && before) continue; // sudah tersimpan di server
    const local = buildLocalTransaction(op.id, userId, op.input, before ?? undefined);
    txs = txs.filter((t) => t.id !== op.id);
    txs.push(local);
    accs = adjustBalances(accs, before, local);
  }
  return { transactions: sortTransactions(txs), accounts: accs };
}

async function sendOp(userId: string, op: QueuedOp): Promise<void> {
  if (op.kind === 'create') await transactionApi.create(userId, op.input, null, op.id);
  else if (op.kind === 'update') await transactionApi.update(op.id, op.input);
  else await transactionApi.remove(op.id);
}

const STALE_MS = 5 * 60 * 1000;

const initialData = {
  accounts: [] as Account[],
  categories: [] as Category[],
  transactions: [] as Transaction[],
  budgets: [] as Budget[],
  goals: [] as Goal[],
  recurring: [] as RecurringTemplate[],
};

export const useFinanceStore = create<FinanceState>((set, get) => {
  const requireUser = (): string => {
    const uid = get().userId;
    if (!uid) throw new Error('Sesi tidak valid. Silakan masuk kembali.');
    return uid;
  };

  const applyRow = (table: DataTable, row: { id: string }) => {
    const key = LIST_KEY[table];
    set({ [key]: upsertRow(get()[key] as never[], row as never, table) } as Partial<FinanceState>);
  };

  const dropRow = (table: DataTable, id: string) => {
    const key = LIST_KEY[table];
    set({ [key]: removeRow(get()[key] as { id: string }[], id) } as Partial<FinanceState>);
  };

  const loaders: Record<DataTable, (uid: string) => Promise<unknown[]>> = {
    accounts: accountApi.list,
    categories: categoryApi.list,
    transactions: transactionApi.list,
    budgets: budgetApi.list,
    goals: goalApi.list,
    recurring_templates: recurringApi.list,
  };

  const runRecurring = async () => {
    const today = getTodayISO();
    if (lastRecurringRunDate === today) return 0;
    try {
      const created = await setupApi.processRecurring(today);
      lastRecurringRunDate = today;
      return created;
    } catch (err) {
      console.warn('[Fundly] Gagal memproses transaksi berulang:', err);
      return 0;
    }
  };

  const handleChange = (table: DataTable) => (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    const uid = get().userId;
    if (!uid) return;
    if (payload.eventType === 'DELETE') {
      const id = (payload.old as { id?: string })?.id;
      if (id) dropRow(table, id);
      return;
    }
    const raw = payload.new as Record<string, unknown>;
    if (!raw || raw.user_id !== uid) return;
    const row = (normalizers[table] as (r: Record<string, unknown>) => { id: string })(raw);
    applyRow(table, row);
    set({ lastSyncedAt: Date.now() });
  };

  const subscribeRealtime = (uid: string) => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    hasSubscribedOnce = false;
    set({ realtimeStatus: 'connecting' });

    let ch = supabase.channel(`fundly-sync-${uid}`);
    (Object.keys(LIST_KEY) as DataTable[]).forEach((table) => {
      ch = ch
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `user_id=eq.${uid}` }, handleChange(table))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `user_id=eq.${uid}` }, handleChange(table))
        // DELETE tidak dapat difilter; payload hanya berisi primary key
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, handleChange(table));
    });
    ch = ch.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
      (payload) => {
        const profile = normalizers.profiles(payload.new as Record<string, unknown>) as Profile;
        useAuthStore.getState().setProfile(profile);
      },
    );

    channel = ch.subscribe((status) => {
      if (get().userId !== uid) return;
      if (status === 'SUBSCRIBED') {
        set({ realtimeStatus: 'live' });
        // Setelah reconnect, ambil ulang data untuk menangkap event yang terlewat
        if (hasSubscribedOnce) void get().reload({ silent: true });
        hasSubscribedOnce = true;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        set({ realtimeStatus: 'offline' });
      }
    });
  };

  const bindLifecycle = () => {
    if (lifecycleBound || typeof window === 'undefined') return;
    lifecycleBound = true;
    const refreshIfStale = () => {
      const { userId, status, lastSyncedAt } = get();
      if (!userId || status !== 'ready') return;
      const isStale = !lastSyncedAt || Date.now() - lastSyncedAt > STALE_MS;
      const dayChanged = lastRecurringRunDate !== getTodayISO();
      if (isStale || dayChanged || get().realtimeStatus !== 'live') void get().reload({ silent: true });
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshIfStale();
    });
    window.addEventListener('online', () => void get().reload({ silent: true }));
    // Coba kirim ulang antrian berkala (mis. sinyal sempat putus tanpa event "offline")
    window.setInterval(() => {
      const { userId, pendingCount } = get();
      if (userId && pendingCount > 0 && !isOfflineNow()) void get().reload({ silent: true });
    }, 60_000);
  };

  return {
    userId: null,
    status: 'idle',
    error: null,
    isRefreshing: false,
    realtimeStatus: 'idle',
    lastSyncedAt: null,
    pendingCount: 0,
    isSyncing: false,
    ...initialData,

    init: async (userId) => {
      if (get().userId === userId && (get().status === 'ready' || initPromise)) return initPromise ?? undefined;
      if (get().userId && get().userId !== userId) get().reset();

      // Tampilkan data terakhir dari cache perangkat secara instan (jika ada),
      // lalu sinkronkan diam-diam dengan server
      const cached = readFinanceCache(userId);
      set({ pendingCount: readQueue(userId).length });
      if (cached) {
        set({ userId, ...cached, status: 'ready', error: null, isRefreshing: true });
      } else {
        set({ userId, status: 'loading', error: null });
      }
      bindLifecycle();

      initPromise = (async () => {
        try {
          try {
            await setupApi.ensureUserSetup();
          } catch (err) {
            console.warn('[Fundly] ensure_user_setup gagal:', err);
          }
          await runRecurring();
          if (get().userId !== userId) return;
          await get().reload({ silent: Boolean(cached) });
          if (get().userId !== userId || get().status !== 'ready') return;
          subscribeRealtime(userId);
        } finally {
          initPromise = null;
        }
      })();
      return initPromise;
    },

    reload: async (options) => {
      const uid = get().userId;
      if (!uid) return;
      const silent = options?.silent && get().status === 'ready';
      set(silent ? { isRefreshing: true } : { status: 'loading', error: null });
      try {
        await get().syncPending();
        if (silent) await runRecurring();
        const [serverAccounts, categories, serverTransactions, budgets, goals, recurring] = await Promise.all([
          accountApi.list(uid),
          categoryApi.list(uid),
          transactionApi.list(uid),
          budgetApi.list(uid),
          goalApi.list(uid),
          recurringApi.list(uid),
        ]);
        if (get().userId !== uid) return;
        const { transactions, accounts } = overlayQueue(uid, serverTransactions, serverAccounts);
        set({
          accounts,
          categories,
          transactions,
          budgets,
          goals,
          recurring,
          status: 'ready',
          error: null,
          isRefreshing: false,
          lastSyncedAt: Date.now(),
        });
      } catch (err) {
        if (get().userId !== uid) return;
        const message = err instanceof Error ? err.message : 'Gagal memuat data.';
        if (silent) {
          console.warn('[Fundly] Sinkronisasi latar gagal:', message);
          set({ isRefreshing: false });
        } else {
          set({ status: 'error', error: message, isRefreshing: false });
        }
      }
    },

    refreshTables: async (tables) => {
      const uid = get().userId;
      if (!uid) return;
      try {
        const results = await Promise.all(tables.map((t) => loaders[t](uid)));
        if (get().userId !== uid) return;
        const patch: Partial<FinanceState> = {};
        tables.forEach((t, i) => {
          (patch as Record<string, unknown>)[LIST_KEY[t]] = results[i];
        });
        set({ ...patch, lastSyncedAt: Date.now() });
      } catch (err) {
        console.warn('[Fundly] Gagal menyegarkan data:', err);
      }
    },

    reset: () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      initPromise = null;
      hasSubscribedOnce = false;
      lastRecurringRunDate = null;
      set({
        userId: null,
        status: 'idle',
        error: null,
        isRefreshing: false,
        realtimeStatus: 'idle',
        lastSyncedAt: null,
        pendingCount: 0,
        isSyncing: false,
        ...initialData,
      });
    },

    syncPending: async () => {
      if (syncPromise) return syncPromise;
      const uid = get().userId;
      if (!uid || isOfflineNow() || readQueue(uid).length === 0) return;
      syncPromise = (async () => {
        set({ isSyncing: true });
        let sent = 0;
        let failed = 0;
        try {
          for (const op of readQueue(uid)) {
            if (get().userId !== uid) return;
            try {
              await sendOp(uid, op);
              removeOp(uid, op);
              sent++;
            } catch (err) {
              if (isNetworkError(err)) break; // masih offline: coba lagi nanti
              const msg = err instanceof Error ? err.message.toLowerCase() : '';
              removeOp(uid, op);
              if (op.kind === 'create' && msg.includes('sudah ada')) sent++; // sudah pernah terkirim
              else if (op.kind !== 'create' && msg.includes('rows')) sent++; // baris sudah tidak ada di server
              else {
                failed++;
                console.warn('[Fundly] Antrian offline ditolak server:', err);
              }
            }
          }
        } finally {
          set({ isSyncing: false, pendingCount: readQueue(uid).length });
          syncPromise = null;
        }
        if (sent > 0) toast.success(sent + ' perubahan offline berhasil disinkronkan', { id: 'offline-sync' });
        if (failed > 0) toast.error(failed + ' transaksi offline ditolak server (data tidak valid)', { id: 'offline-sync-failed' });
      })();
      return syncPromise;
    },

    // ---------------- Transactions ----------------
    addTransaction: async (input, recurring) => {
      const uid = requireUser();
      if (recurring && input.type !== 'transfer' && isOfflineNow()) {
        throw new Error('Transaksi berulang butuh koneksi internet. Matikan opsi berulang untuk menyimpan offline.');
      }
      if (recurring && input.type !== 'transfer') {
        const template = await recurringApi.create(uid, {
          type: input.type,
          amount: input.amount,
          account_id: input.account_id,
          category_id: input.category_id ?? null,
          frequency: recurring.frequency,
          start_date: input.transaction_date,
          end_date: recurring.end_date,
          transaction_time: input.transaction_time,
          note: input.note ?? null,
        });
        applyRow('recurring_templates', template);
        // Transaksi pertama (jika tanggal mulai <= hari ini) dibuat oleh RPC di server
        lastRecurringRunDate = null;
        await runRecurring();
        await get().refreshTables(['transactions', 'accounts', 'recurring_templates']);
        return get().transactions.find((t) => t.recurring_id === template.id) ?? null;
      }
      const id = newId();
      lastWriteQueued = false;
      if (!isOfflineNow() && get().pendingCount === 0) {
        try {
          const tx = await transactionApi.create(uid, input, null, id);
          applyRow('transactions', tx);
          void get().refreshTables(['accounts']);
          return tx;
        } catch (err) {
          if (!isNetworkError(err)) throw err;
        }
      }
      // Offline (atau masih ada antrian sebelumnya): simpan di perangkat dulu agar urutan terjaga
      const local = buildLocalTransaction(id, uid, input);
      enqueue(uid, { kind: 'create', id, input, queuedAt: Date.now() });
      lastWriteQueued = true;
      applyRow('transactions', local);
      set({ accounts: adjustBalances(get().accounts, null, local) });
      if (!isOfflineNow()) void get().syncPending().then(() => get().refreshTables(['accounts']));
      return local;
    },

    updateTransaction: async (id, input) => {
      const uid = requireUser();
      const before = get().transactions.find((t) => t.id === id) ?? null;
      const hasPendingCreate = readQueue(uid).some((o) => o.kind === 'create' && o.id === id);
      lastWriteQueued = false;
      if (!isOfflineNow() && !hasPendingCreate) {
        try {
          const tx = await transactionApi.update(id, input);
          applyRow('transactions', tx);
          void get().refreshTables(['accounts']);
          return tx;
        } catch (err) {
          if (!isNetworkError(err)) throw err;
        }
      }
      const local = buildLocalTransaction(id, uid, input, before ?? undefined);
      enqueue(uid, { kind: 'update', id, input, queuedAt: Date.now() });
      lastWriteQueued = true;
      applyRow('transactions', local);
      set({ accounts: adjustBalances(get().accounts, before, local) });
      if (!isOfflineNow()) void get().syncPending();
      return local;
    },

    deleteTransaction: async (id) => {
      const uid = requireUser();
      const before = get().transactions.find((t) => t.id === id) ?? null;
      const hasPendingCreate = readQueue(uid).some((o) => o.kind === 'create' && o.id === id);
      lastWriteQueued = false;
      if (!isOfflineNow() && !hasPendingCreate) {
        try {
          await transactionApi.remove(id);
          dropRow('transactions', id);
          void get().refreshTables(['accounts']);
          return;
        } catch (err) {
          if (!isNetworkError(err)) throw err;
        }
      }
      enqueue(uid, { kind: 'delete', id, queuedAt: Date.now() });
      lastWriteQueued = !hasPendingCreate;
      dropRow('transactions', id);
      if (before) set({ accounts: adjustBalances(get().accounts, before, null) });
      if (!isOfflineNow()) void get().syncPending();
    },

    // ---------------- Accounts ----------------
    addAccount: async (input) => {
      const uid = requireUser();
      const maxOrder = get().accounts.reduce((m, a) => Math.max(m, a.sort_order), 0);
      const account = await accountApi.create(uid, input, maxOrder + 1);
      applyRow('accounts', account);
      return account;
    },

    updateAccount: async (id, patch) => {
      const account = await accountApi.update(id, patch);
      applyRow('accounts', account);
      return account;
    },

    setAccountActive: async (id, active) => {
      const account = await accountApi.update(id, { is_active: active });
      applyRow('accounts', account);
      return account;
    },

    // ---------------- Categories ----------------
    addCategory: async (input) => {
      const uid = requireUser();
      const maxOrder = get()
        .categories.filter((c) => c.type === input.type)
        .reduce((m, c) => Math.max(m, c.sort_order), 0);
      const category = await categoryApi.create(uid, input, maxOrder + 1);
      applyRow('categories', category);
      return category;
    },

    updateCategory: async (id, patch) => {
      const category = await categoryApi.update(id, patch);
      applyRow('categories', category);
      return category;
    },

    deleteCategory: async (id) => {
      await categoryApi.remove(id);
      dropRow('categories', id);
      // Transaksi terkait menjadi "Tanpa Kategori", anggaran terkait ikut terhapus
      set({
        transactions: get().transactions.map((t) => (t.category_id === id ? { ...t, category_id: null } : t)),
        budgets: get().budgets.filter((b) => b.category_id !== id),
      });
    },

    // ---------------- Budgets ----------------
    saveBudget: async (input, id) => {
      const uid = requireUser();
      const budget = id ? await budgetApi.update(id, input) : await budgetApi.upsert(uid, input);
      applyRow('budgets', budget);
      return budget;
    },

    deleteBudget: async (id) => {
      await budgetApi.remove(id);
      dropRow('budgets', id);
    },

    copyBudgets: async (from, to) => {
      const uid = requireUser();
      const existing = new Set(
        get()
          .budgets.filter((b) => b.month === to.month && b.year === to.year)
          .map((b) => b.category_id),
      );
      const source = get().budgets.filter(
        (b) => b.month === from.month && b.year === from.year && !existing.has(b.category_id),
      );
      const created = await budgetApi.upsertMany(
        uid,
        source.map((b) => ({ category_id: b.category_id, amount_limit: b.amount_limit, month: to.month, year: to.year })),
      );
      created.forEach((b) => applyRow('budgets', b));
      return created.length;
    },

    // ---------------- Goals ----------------
    addGoal: async (input) => {
      const uid = requireUser();
      const goal = await goalApi.create(uid, input);
      applyRow('goals', goal);
      return goal;
    },

    updateGoal: async (id, patch) => {
      const goal = await goalApi.update(id, patch);
      applyRow('goals', goal);
      return goal;
    },

    adjustGoal: async (id, delta) => {
      const goal = await goalApi.adjustAmount(id, delta);
      applyRow('goals', goal);
      return goal;
    },

    deleteGoal: async (id) => {
      await goalApi.remove(id);
      dropRow('goals', id);
    },

    // ---------------- Recurring ----------------
    setRecurringActive: async (id, active) => {
      const tpl = await recurringApi.update(id, { is_active: active });
      applyRow('recurring_templates', tpl);
      if (active) {
        lastRecurringRunDate = null;
        const created = await runRecurring();
        if (created > 0) await get().refreshTables(['transactions', 'accounts', 'recurring_templates']);
      }
      return tpl;
    },

    deleteRecurring: async (id) => {
      await recurringApi.remove(id);
      dropRow('recurring_templates', id);
      set({
        transactions: get().transactions.map((t) => (t.recurring_id === id ? { ...t, recurring_id: null } : t)),
      });
    },
  };
});

// ---- Simpan snapshot data ke cache perangkat (debounce) ----
let persistTimer: ReturnType<typeof setTimeout> | null = null;
useFinanceStore.subscribe((state, prev) => {
  if (!state.userId || state.status !== 'ready') return;
  const changed =
    state.accounts !== prev.accounts ||
    state.categories !== prev.categories ||
    state.transactions !== prev.transactions ||
    state.budgets !== prev.budgets ||
    state.goals !== prev.goals ||
    state.recurring !== prev.recurring;
  if (!changed) return;
  if (persistTimer) clearTimeout(persistTimer);
  const userId = state.userId;
  persistTimer = setTimeout(() => {
    const current = useFinanceStore.getState();
    if (current.userId !== userId || current.status !== 'ready') return;
    writeFinanceCache(userId, {
      accounts: current.accounts,
      categories: current.categories,
      transactions: current.transactions,
      budgets: current.budgets,
      goals: current.goals,
      recurring: current.recurring,
    });
  }, isLiteMode() ? 2500 : 800); // HP lemah: serialisasi data lebih jarang
});

// Indikator jumlah antrian offline
onQueueChange((count) => useFinanceStore.setState({ pendingCount: count }));
