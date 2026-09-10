// ============================================
// Fundly.id — Common Shared Types
// ============================================

// Transaction types
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'cleared' | 'pending';

// Account types
export type AccountType = 'cash' | 'bank' | 'ewallet' | 'credit_card';

// Category types
export type CategoryType = 'income' | 'expense';

// Recurring frequency
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Budget status
export type BudgetStatus = 'safe' | 'warning' | 'danger' | 'exceeded';

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface TransactionFilters {
  search?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  tags?: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Report types
export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyComparison {
  category: string;
  currentMonth: number;
  previousMonth: number;
  changePercent: number;
}

export interface CashFlowData {
  month: string;
  income: number;
  expense: number;
}

export interface WeeklyData {
  day: string;
  amount: number;
}

// Goal projection
export interface GoalProjection {
  goalId: string;
  projectedDate: Date | null;
  monthlyRequired: number;
  dailyRequired: number;
  onTrack: boolean;
}

// UI types
export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
