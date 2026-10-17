// ============================================
// Fundly.id - Peringatan keuangan (anggaran, tagihan rutin, target)
// Dihitung real-time dari data; dipakai lonceng notifikasi & notifikasi HP.
// ============================================

import { useMemo } from 'react';
import { AlertTriangle, CalendarClock, Target } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useFinanceStore } from '../stores/financeStore';
import { useCategoryMap, useLiveGoals } from './useFinance';
import { budgetHealth, goalProjection, spentForBudget } from '../utils/finance';
import { formatCurrency } from '../utils/formatCurrency';
import { ROUTES } from '../config/routes';

export interface FinanceAlert {
  id: string;
  kind: 'danger' | 'warning' | 'info';
  icon: React.ElementType;
  title: string;
  body: string;
  path: string;
}

export function useFinanceAlerts(): FinanceAlert[] {
  const budgets = useFinanceStore((s) => s.budgets);
  const transactions = useFinanceStore((s) => s.transactions);
  const recurring = useFinanceStore((s) => s.recurring);
  const goals = useLiveGoals();
  const categoriesById = useCategoryMap();

  return useMemo<FinanceAlert[]>(() => {
    const items: FinanceAlert[] = [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Anggaran bulan ini yang mendekati / melewati limit
    budgets
      .filter((b) => b.month === month && b.year === year)
      .forEach((b) => {
        const spent = spentForBudget(transactions, b);
        const health = budgetHealth(spent, b.amount_limit);
        if (health === 'safe') return;
        const name = categoriesById.get(b.category_id)?.name || 'Kategori';
        const pct = Math.round((spent / b.amount_limit) * 100);
        items.push({
          id: `budget-${b.id}-${health}-${year}-${month}`,
          kind: health === 'over' ? 'danger' : 'warning',
          icon: AlertTriangle,
          title: health === 'over' ? `Anggaran ${name} terlampaui` : `Anggaran ${name} hampir habis`,
          body:
            health === 'over'
              ? `Lewat ${formatCurrency(spent - b.amount_limit)} dari limit ${formatCurrency(b.amount_limit)}.`
              : `Sudah terpakai ${pct}% dari limit ${formatCurrency(b.amount_limit)}.`,
          path: ROUTES.BUDGET,
        });
      });

    // 2. Pengingat transaksi rutin (H-3 s/d hari H)
    recurring
      .filter((r) => r.is_active && r.type === 'expense')
      .forEach((r) => {
        const days = differenceInCalendarDays(parseISO(r.next_run_date), now);
        if (days < 0 || days > 3) return;
        const name = r.note || categoriesById.get(r.category_id || '')?.name || 'Tagihan rutin';
        items.push({
          id: `recurring-${r.id}-${r.next_run_date}`,
          kind: days <= 1 ? 'warning' : 'info',
          icon: CalendarClock,
          title: days === 0 ? `${name} jatuh tempo hari ini` : `${name} jatuh tempo H-${days}`,
          body: `${formatCurrency(r.amount)} akan tercatat otomatis.`,
          path: ROUTES.SETTINGS,
        });
      });

    // 3. Target tabungan mendekati / melewati tenggat
    goals.forEach((g) => {
      const proj = goalProjection(g, now);
      if (proj.achieved || !g.deadline) return;
      const days = differenceInCalendarDays(parseISO(g.deadline), now);
      if (days > 30) return;
      items.push({
        id: `goal-${g.id}-${proj.overdue ? 'overdue' : 'soon'}`,
        kind: proj.overdue ? 'danger' : 'info',
        icon: Target,
        title: proj.overdue ? `Target "${g.name}" melewati tenggat` : `Target "${g.name}" segera jatuh tempo`,
        body: `Masih kurang ${formatCurrency(proj.remaining)} untuk mencapai target.`,
        path: ROUTES.GOALS,
      });
    });

    return items;
  }, [budgets, transactions, recurring, goals, categoriesById]);
}
