// ============================================
// Fundly.id - Financial Aggregation Helpers (pure functions)
// ============================================

import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  endOfYear,
  subDays,
} from 'date-fns';
import type { Account, Budget, Category, Goal, Transaction } from '../types/models';
import { toISODate, MONTHS_SHORT } from './formatDate';

export interface DateRangeISO {
  start: string; // yyyy-MM-dd (inklusif)
  end: string; // yyyy-MM-dd (inklusif)
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface SeriesPoint {
  key: string;
  label: string;
  start: string;
  end: string;
  income: number;
  expense: number;
  savings: number;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

export const UNCATEGORIZED = {
  id: '__none__',
  name: 'Tanpa Kategori',
  icon: 'tag',
  color: '#AEAEB2',
};

/** Transaksi yang terhitung (cleared) */
export function isCounted(tx: Transaction): boolean {
  return tx.status === 'cleared';
}

export function inRange(tx: Transaction, range: DateRangeISO): boolean {
  return tx.transaction_date >= range.start && tx.transaction_date <= range.end;
}

export function filterByRange(txs: Transaction[], range: DateRangeISO): Transaction[] {
  return txs.filter((tx) => inRange(tx, range));
}

/** Total pemasukan & pengeluaran (transfer tidak dihitung agar laporan tidak dobel). */
export function computeTotals(txs: Transaction[], range?: DateRangeISO): Totals {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const tx of txs) {
    if (!isCounted(tx)) continue;
    if (range && !inRange(tx, range)) continue;
    if (tx.type === 'income') {
      income += tx.amount;
      count++;
    } else if (tx.type === 'expense') {
      expense += tx.amount;
      count++;
    }
  }
  return { income, expense, net: income - expense, count };
}

export function categoryBreakdown(
  txs: Transaction[],
  categoriesById: Map<string, Category>,
  type: 'income' | 'expense',
  range?: DateRangeISO,
): CategoryBreakdownItem[] {
  const map = new Map<string, CategoryBreakdownItem>();
  let total = 0;

  for (const tx of txs) {
    if (tx.type !== type || !isCounted(tx)) continue;
    if (range && !inRange(tx, range)) continue;
    const cat = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
    const key = cat?.id || UNCATEGORIZED.id;
    let item = map.get(key);
    if (!item) {
      item = {
        id: key,
        name: cat?.name || UNCATEGORIZED.name,
        icon: cat?.icon || UNCATEGORIZED.icon,
        color: cat?.color || UNCATEGORIZED.color,
        amount: 0,
        percentage: 0,
        count: 0,
      };
      map.set(key, item);
    }
    item.amount += tx.amount;
    item.count += 1;
    total += tx.amount;
  }

  const items = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  if (total > 0) {
    // Persentase dibulatkan dengan metode largest-remainder agar totalnya tepat 100%
    const raw = items.map((i) => (i.amount / total) * 100);
    const floors = raw.map(Math.floor);
    let remainder = 100 - floors.reduce((s, v) => s + v, 0);
    const order = raw.map((v, idx) => ({ idx, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
    for (const o of order) {
      if (remainder <= 0) break;
      floors[o.idx] += 1;
      remainder--;
    }
    items.forEach((i, idx) => (i.percentage = floors[idx]));
  }
  return items;
}

/** Persentase perubahan; null jika pembanding 0 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function formatPctChange(change: number | null): string {
  if (change === null) return 'Baru';
  return `${change > 0 ? '+' : ''}${change}%`;
}

// ---- Period helpers ----

export function monthRange(year: number, month0: number): DateRangeISO {
  const d = new Date(year, month0, 1);
  return { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) };
}

export function previousRange(range: DateRangeISO): DateRangeISO {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  // Jika rentang tepat satu bulan kalender → bandingkan dengan bulan sebelumnya
  if (
    toISODate(startOfMonth(start)) === range.start &&
    toISODate(endOfMonth(start)) === range.end
  ) {
    return monthRange(start.getFullYear(), start.getMonth() - 1);
  }
  if (
    toISODate(startOfYear(start)) === range.start &&
    toISODate(endOfYear(start)) === range.end
  ) {
    const y = start.getFullYear() - 1;
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  const days = differenceInCalendarDays(end, start) + 1;
  return { start: toISODate(subDays(start, days)), end: toISODate(subDays(end, days)) };
}

export function daysInRange(range: DateRangeISO): number {
  return differenceInCalendarDays(parseISO(range.end), parseISO(range.start)) + 1;
}

/** Jumlah hari yang sudah berjalan dalam rentang (untuk rata-rata harian) */
export function elapsedDaysInRange(range: DateRangeISO, today = new Date()): number {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  if (today < start) return 0;
  const effectiveEnd = today < end ? today : end;
  return differenceInCalendarDays(effectiveEnd, start) + 1;
}

/** Buat deret waktu (harian/mingguan/bulanan) pemasukan vs pengeluaran */
export function buildSeries(txs: Transaction[], range: DateRangeISO, granularity: Granularity): SeriesPoint[] {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  const points: SeriesPoint[] = [];

  if (granularity === 'daily') {
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const iso = toISODate(d);
      points.push({ key: iso, label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, start: iso, end: iso, income: 0, expense: 0, savings: 0 });
    }
  } else if (granularity === 'weekly') {
    for (let d = startOfWeek(start, { weekStartsOn: 1 }); d <= end; d = addDays(d, 7)) {
      const ws = d < start ? start : d;
      const weRaw = endOfWeek(d, { weekStartsOn: 1 });
      const we = weRaw > end ? end : weRaw;
      points.push({
        key: toISODate(ws),
        label: `${ws.getDate()} ${MONTHS_SHORT[ws.getMonth()]}`,
        start: toISODate(ws),
        end: toISODate(we),
        income: 0,
        expense: 0,
        savings: 0,
      });
    }
  } else {
    const months = differenceInCalendarMonths(end, start);
    for (let i = 0; i <= months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const ms = d < start ? start : d;
      const meRaw = endOfMonth(d);
      const me = meRaw > end ? end : meRaw;
      points.push({
        key: format(d, 'yyyy-MM'),
        label: `${MONTHS_SHORT[d.getMonth()]}${months >= 12 ? ` ${String(d.getFullYear()).slice(2)}` : ''}`,
        start: toISODate(ms),
        end: toISODate(me),
        income: 0,
        expense: 0,
        savings: 0,
      });
    }
  }

  if (points.length === 0) return points;

  for (const tx of txs) {
    if (!isCounted(tx) || tx.type === 'transfer') continue;
    if (tx.transaction_date < range.start || tx.transaction_date > range.end) continue;
    // Binary search titik yang memuat tanggal transaksi
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (points[mid].start <= tx.transaction_date) lo = mid;
      else hi = mid - 1;
    }
    const p = points[lo];
    if (tx.type === 'income') p.income += tx.amount;
    else p.expense += tx.amount;
  }
  points.forEach((p) => (p.savings = p.income - p.expense));
  return points;
}

/** Arus kas N bulan terakhir (termasuk bulan ini) */
export function lastMonthsCashflow(txs: Transaction[], months: number, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const range = { start: toISODate(start), end: toISODate(endOfMonth(today)) };
  return buildSeries(txs, range, 'monthly').map((p) => ({
    month: MONTHS_SHORT[parseISO(p.start).getMonth()],
    income: p.income,
    expense: p.expense,
  }));
}

/** Arus kas per bulan dalam satu tahun kalender */
export function yearCashflow(txs: Transaction[], year: number) {
  return buildSeries(txs, { start: `${year}-01-01`, end: `${year}-12-31` }, 'monthly').map((p) => ({
    month: MONTHS_SHORT[parseISO(p.start).getMonth()],
    income: p.income,
    expense: p.expense,
  }));
}

/** Pengeluaran sebuah kategori pada bulan tertentu (month 1-12) */
export function spentForBudget(txs: Transaction[], budget: Pick<Budget, 'category_id' | 'month' | 'year'>): number {
  const range = monthRange(budget.year, budget.month - 1);
  let total = 0;
  for (const tx of txs) {
    if (tx.type === 'expense' && isCounted(tx) && tx.category_id === budget.category_id && inRange(tx, range)) {
      total += tx.amount;
    }
  }
  return total;
}

export type BudgetHealth = 'safe' | 'warning' | 'over';

export function budgetHealth(spent: number, limit: number): BudgetHealth {
  if (limit <= 0) return 'safe';
  if (spent > limit) return 'over';
  if (spent / limit >= 0.8) return 'warning';
  return 'safe';
}

export function totalBalance(accounts: Account[]): number {
  return accounts.filter((a) => a.is_active).reduce((sum, a) => sum + a.balance, 0);
}

export interface GoalProjection {
  percentage: number;
  remaining: number;
  achieved: boolean;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  overdue: boolean;
}

export function goalProjection(goal: Goal, today = new Date()): GoalProjection {
  const target = Math.max(goal.target_amount, 1);
  const percentage = Math.min(100, Math.floor((goal.current_amount / target) * 100));
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const achieved = goal.current_amount >= goal.target_amount;

  if (!goal.deadline || achieved) {
    return { percentage, remaining, achieved, monthsLeft: null, monthlyNeeded: null, overdue: false };
  }
  const deadline = parseISO(goal.deadline);
  const overdue = deadline < today;
  const monthsLeft = Math.max(0, differenceInCalendarMonths(deadline, today));
  const monthlyNeeded = overdue ? remaining : Math.ceil(remaining / Math.max(1, monthsLeft));
  return { percentage, remaining, achieved, monthsLeft, monthlyNeeded, overdue };
}

/** Teks bulan-tahun untuk deadline goal, mis. "Des 2027" */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'Tanpa tenggat';
  const d = parseISO(deadline);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function sortTransactions(txs: Transaction[]): Transaction[] {
  return txs.sort((a, b) => {
    if (a.transaction_date !== b.transaction_date) return a.transaction_date < b.transaction_date ? 1 : -1;
    if (a.transaction_time !== b.transaction_time) return a.transaction_time < b.transaction_time ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}
