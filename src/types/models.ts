// ============================================
// Fundly.id — Domain Models (mirror tabel Supabase)
// Semua nominal dalam Rupiah utuh.
// ============================================

import type {
  AccountType,
  CategoryType,
  RecurringFrequency,
  TransactionStatus,
  TransactionType,
} from './common';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  recurring_id: string | null;
  type: TransactionType;
  amount: number;
  note: string | null;
  location: string | null;
  receipt_url: string | null;
  status: TransactionStatus;
  transaction_date: string; // yyyy-MM-dd
  transaction_time: string; // HH:mm:ss
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount_limit: number;
  month: number; // 1-12
  year: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  category: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null; // yyyy-MM-dd
  color: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringTemplate {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  transaction_time: string;
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Input payloads ----

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  account_id: string;
  to_account_id?: string | null;
  category_id?: string | null;
  note?: string | null;
  status?: TransactionStatus;
  transaction_date: string;
  transaction_time: string;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance?: number;
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export interface BudgetInput {
  category_id: string;
  amount_limit: number;
  month: number;
  year: number;
}

export interface GoalInput {
  name: string;
  category?: string;
  icon: string;
  color: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
}

export interface RecurringInput {
  type: 'income' | 'expense';
  amount: number;
  account_id: string;
  category_id: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  transaction_time: string;
  note?: string | null;
}
