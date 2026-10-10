// ============================================
// Fundly.id — Supabase Data API
// Semua fungsi melempar Error (pesan ramah) jika gagal.
// ============================================

import { supabase, toFriendlyError } from '../lib/supabase';
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

const PAGE_SIZE = 1000;

function fail(error: unknown): never {
  throw new Error(toFriendlyError(error));
}

/** Ambil seluruh baris milik user dengan paginasi (PostgREST membatasi 1000 baris/request). */
async function fetchAll<T>(
  table: string,
  userId: string,
  order: { column: string; ascending: boolean }[],
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select('*').eq('user_id', userId);
    for (const o of order) query = query.order(o.column, { ascending: o.ascending });
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) fail(error);
    rows.push(...((data || []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

function normalizeTransaction(row: Record<string, unknown>): Transaction {
  return { ...(row as unknown as Transaction), amount: Number(row.amount) };
}

function normalizeAccount(row: Record<string, unknown>): Account {
  return { ...(row as unknown as Account), balance: Number(row.balance) };
}

function normalizeBudget(row: Record<string, unknown>): Budget {
  return { ...(row as unknown as Budget), amount_limit: Number(row.amount_limit) };
}

function normalizeGoal(row: Record<string, unknown>): Goal {
  return {
    ...(row as unknown as Goal),
    target_amount: Number(row.target_amount),
    current_amount: Number(row.current_amount),
  };
}

function normalizeRecurring(row: Record<string, unknown>): RecurringTemplate {
  return { ...(row as unknown as RecurringTemplate), amount: Number(row.amount) };
}

export const normalizers = {
  transactions: normalizeTransaction,
  accounts: normalizeAccount,
  budgets: normalizeBudget,
  goals: normalizeGoal,
  recurring_templates: normalizeRecurring,
  categories: (row: Record<string, unknown>) => row as unknown as Category,
  profiles: (row: Record<string, unknown>) => row as unknown as Profile,
};

// ============================================
// Bootstrap
// ============================================

export const setupApi = {
  /** Pastikan profil, kategori & akun default ada (untuk user lama). */
  async ensureUserSetup(): Promise<void> {
    const { error } = await supabase.rpc('ensure_user_setup');
    if (error) fail(error);
  },

  /** Buat transaksi dari template berulang yang sudah jatuh tempo. */
  async processRecurring(todayISO: string): Promise<number> {
    const { data, error } = await supabase.rpc('process_recurring_transactions', { p_today: todayISO });
    if (error) fail(error);
    return Number(data) || 0;
  },
};

// ============================================
// Profiles
// ============================================

export const profileApi = {
  async get(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) fail(error);
    return (data as Profile) || null;
  },

  async update(userId: string, patch: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'currency'>>): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
    if (error) fail(error);
    return data as Profile;
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });
    if (error) fail(error);
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },

  async removeOldAvatars(userId: string, keepUrl: string): Promise<void> {
    const { data } = await supabase.storage.from('avatars').list(userId);
    const stale = (data || []).map((f) => `${userId}/${f.name}`).filter((p) => !keepUrl.includes(p));
    if (stale.length) await supabase.storage.from('avatars').remove(stale);
  },
};

// ============================================
// Accounts
// ============================================

export const accountApi = {
  async list(userId: string): Promise<Account[]> {
    const rows = await fetchAll<Record<string, unknown>>('accounts', userId, [
      { column: 'sort_order', ascending: true },
      { column: 'created_at', ascending: true },
    ]);
    return rows.map(normalizeAccount);
  },

  async create(userId: string, input: AccountInput, sortOrder: number): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id: userId, ...input, balance: input.balance ?? 0, sort_order: sortOrder })
      .select()
      .single();
    if (error) fail(error);
    return normalizeAccount(data);
  },

  async update(id: string, patch: Partial<AccountInput & { is_active: boolean; sort_order: number }>): Promise<Account> {
    const { data, error } = await supabase.from('accounts').update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return normalizeAccount(data);
  },
};

// ============================================
// Categories
// ============================================

export const categoryApi = {
  async list(userId: string): Promise<Category[]> {
    return fetchAll<Category>('categories', userId, [
      { column: 'type', ascending: true },
      { column: 'sort_order', ascending: true },
      { column: 'created_at', ascending: true },
    ]);
  },

  async create(userId: string, input: CategoryInput, sortOrder: number): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, ...input, is_default: false, sort_order: sortOrder })
      .select()
      .single();
    if (error) fail(error);
    return data as Category;
  },

  async update(id: string, patch: Partial<Omit<CategoryInput, 'type'>>): Promise<Category> {
    const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return data as Category;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) fail(error);
  },
};

// ============================================
// Transactions
// ============================================

export const transactionApi = {
  async list(userId: string): Promise<Transaction[]> {
    const rows = await fetchAll<Record<string, unknown>>('transactions', userId, [
      { column: 'transaction_date', ascending: false },
      { column: 'transaction_time', ascending: false },
      { column: 'created_at', ascending: false },
    ]);
    return rows.map(normalizeTransaction);
  },

  async create(userId: string, input: TransactionInput, recurringId?: string | null): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        ...input,
        to_account_id: input.type === 'transfer' ? input.to_account_id : null,
        category_id: input.type === 'transfer' ? null : input.category_id ?? null,
        recurring_id: recurringId ?? null,
        status: input.status ?? 'cleared',
      })
      .select()
      .single();
    if (error) fail(error);
    return normalizeTransaction(data);
  },

  async update(id: string, input: TransactionInput): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...input,
        to_account_id: input.type === 'transfer' ? input.to_account_id : null,
        category_id: input.type === 'transfer' ? null : input.category_id ?? null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) fail(error);
    return normalizeTransaction(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) fail(error);
  },
};

// ============================================
// Budgets
// ============================================

export const budgetApi = {
  async list(userId: string): Promise<Budget[]> {
    const rows = await fetchAll<Record<string, unknown>>('budgets', userId, [
      { column: 'year', ascending: false },
      { column: 'month', ascending: false },
    ]);
    return rows.map(normalizeBudget);
  },

  async upsert(userId: string, input: BudgetInput): Promise<Budget> {
    const { data, error } = await supabase
      .from('budgets')
      .upsert({ user_id: userId, ...input }, { onConflict: 'user_id,category_id,month,year' })
      .select()
      .single();
    if (error) fail(error);
    return normalizeBudget(data);
  },

  async update(id: string, patch: Partial<BudgetInput>): Promise<Budget> {
    const { data, error } = await supabase.from('budgets').update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return normalizeBudget(data);
  },

  async upsertMany(userId: string, inputs: BudgetInput[]): Promise<Budget[]> {
    if (inputs.length === 0) return [];
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        inputs.map((i) => ({ user_id: userId, ...i })),
        { onConflict: 'user_id,category_id,month,year', ignoreDuplicates: true },
      )
      .select();
    if (error) fail(error);
    return (data || []).map(normalizeBudget);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) fail(error);
  },
};

// ============================================
// Goals
// ============================================

export const goalApi = {
  async list(userId: string): Promise<Goal[]> {
    const rows = await fetchAll<Record<string, unknown>>('goals', userId, [{ column: 'created_at', ascending: true }]);
    return rows.map(normalizeGoal);
  },

  async create(userId: string, input: GoalInput): Promise<Goal> {
    const { data, error } = await supabase.from('goals').insert({ user_id: userId, ...input }).select().single();
    if (error) fail(error);
    return normalizeGoal(data);
  },

  async update(id: string, patch: Partial<GoalInput>): Promise<Goal> {
    const { data, error } = await supabase.from('goals').update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return normalizeGoal(data);
  },

  async adjustAmount(id: string, delta: number): Promise<Goal> {
    const { data, error } = await supabase.rpc('adjust_goal_amount', { p_goal_id: id, p_delta: delta });
    if (error) fail(error);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Target tidak ditemukan.');
    return normalizeGoal(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) fail(error);
  },
};

// ============================================
// Recurring templates
// ============================================

export const recurringApi = {
  async list(userId: string): Promise<RecurringTemplate[]> {
    const rows = await fetchAll<Record<string, unknown>>('recurring_templates', userId, [
      { column: 'next_run_date', ascending: true },
    ]);
    return rows.map(normalizeRecurring);
  },

  async create(userId: string, input: RecurringInput): Promise<RecurringTemplate> {
    const { data, error } = await supabase
      .from('recurring_templates')
      .insert({
        user_id: userId,
        ...input,
        next_run_date: input.start_date,
        day_of_month: Number(input.start_date.slice(8, 10)),
        is_active: true,
      })
      .select()
      .single();
    if (error) fail(error);
    return normalizeRecurring(data);
  },

  async update(id: string, patch: Partial<Pick<RecurringTemplate, 'is_active' | 'amount' | 'note' | 'end_date'>>): Promise<RecurringTemplate> {
    const { data, error } = await supabase.from('recurring_templates').update(patch).eq('id', id).select().single();
    if (error) fail(error);
    return normalizeRecurring(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('recurring_templates').delete().eq('id', id);
    if (error) fail(error);
  },
};
