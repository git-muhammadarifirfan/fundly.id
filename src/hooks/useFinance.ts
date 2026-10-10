// ============================================
// Fundly.id - Finance Data Hooks (memoized selectors)
// ============================================

import { useMemo } from 'react';
import { useFinanceStore } from '../stores/financeStore';
import type { Account, Category } from '../types/models';

export function useCategoryMap(): Map<string, Category> {
  const categories = useFinanceStore((s) => s.categories);
  return useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
}

export function useAccountMap(): Map<string, Account> {
  const accounts = useFinanceStore((s) => s.accounts);
  return useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
}

export function useActiveAccounts(): Account[] {
  const accounts = useFinanceStore((s) => s.accounts);
  return useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
}

export function useCategoriesByType(type: 'income' | 'expense'): Category[] {
  const categories = useFinanceStore((s) => s.categories);
  return useMemo(() => categories.filter((c) => c.type === type), [categories, type]);
}

/** Status pemuatan data global */
export function useFinanceStatus() {
  const status = useFinanceStore((s) => s.status);
  const error = useFinanceStore((s) => s.error);
  const reload = useFinanceStore((s) => s.reload);
  return {
    isLoading: status === 'idle' || status === 'loading',
    isError: status === 'error',
    error,
    reload,
  };
}
