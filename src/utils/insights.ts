// ============================================
// Fundly.id - Wawasan Keuangan otomatis (dihitung di perangkat dari data user)
// ============================================

import { addDays, differenceInCalendarDays, endOfMonth, parseISO, startOfMonth, subDays } from 'date-fns';
import type { Account, Category, RecurringTemplate, Transaction } from '../types/models';
import { DAYS_OF_WEEK } from '../config/constants';
import { formatCurrency } from './formatCurrency';
import { toISODate } from './formatDate';
import { computeTotals, monthRange, totalBalance } from './finance';

export type InsightTone = 'good' | 'warning' | 'danger' | 'info';

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: 'trend-up' | 'trend-down' | 'calendar' | 'wallet' | 'alert' | 'sparkles' | 'repeat';
  title: string;
  description: string;
  /** Semakin besar semakin penting (untuk urutan tampilan) */
  priority: number;
}

interface InsightInput {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  recurring: RecurringTemplate[];
  today?: Date;
}

const sumExpenseByCategory = (txs: Transaction[], start: string, end: string) => {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense' || t.status !== 'cleared' || !t.category_id) continue;
    if (t.transaction_date < start || t.transaction_date > end) continue;
    map.set(t.category_id, (map.get(t.category_id) || 0) + t.amount);
  }
  return map;
};

export function buildInsights({ transactions, categories, accounts, recurring, today = new Date() }: InsightInput): Insight[] {
  const insights: Insight[] = [];
  if (transactions.length === 0) return insights;

  const todayISO = toISODate(today);
  const monthStart = toISODate(startOfMonth(today));
  const monthEnd = toISODate(endOfMonth(today));
  const dayOfMonth = today.getDate();
  const daysInMonth = endOfMonth(today).getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const thisMonth = computeTotals(transactions, { start: monthStart, end: todayISO });
  const avgDailyExpense = dayOfMonth > 0 ? thisMonth.expense / dayOfMonth : 0;

  // 1) Perkiraan saldo akhir bulan: saldo sekarang + transaksi rutin yang belum jalan - rata-rata belanja harian
  const balance = totalBalance(accounts);
  let recurringNet = 0;
  for (const r of recurring) {
    if (!r.is_active || r.next_run_date > monthEnd || (r.end_date && r.next_run_date > r.end_date)) continue;
    recurringNet += r.type === 'income' ? r.amount : -r.amount;
  }
  if (dayOfMonth >= 3 && daysLeft > 0) {
    const projected = Math.round(balance + recurringNet - avgDailyExpense * daysLeft);
    insights.push({
      id: 'projection',
      tone: projected < 0 ? 'danger' : projected < balance * 0.3 ? 'warning' : 'info',
      icon: 'wallet',
      title: `Perkiraan saldo akhir bulan ${formatCurrency(projected)}`,
      description: `Berdasarkan rata-rata pengeluaran ${formatCurrency(Math.round(avgDailyExpense))}/hari${recurringNet ? ` dan transaksi rutin ${formatCurrency(recurringNet, { showSign: true })}` : ''}.`,
      priority: projected < 0 ? 100 : 60,
    });
  }

  // 2) Kategori yang melonjak dibanding rata-rata 3 bulan sebelumnya (diproporsikan ke hari berjalan)
  const thisCat = sumExpenseByCategory(transactions, monthStart, todayISO);
  const prevTotals = new Map<string, number>();
  let monthsWithData = 0;
  for (let i = 1; i <= 3; i++) {
    const range = monthRange(today.getFullYear(), today.getMonth() - i);
    const m = sumExpenseByCategory(transactions, range.start, range.end);
    if (m.size > 0) monthsWithData++;
    m.forEach((v, k) => prevTotals.set(k, (prevTotals.get(k) || 0) + v));
  }
  if (monthsWithData > 0) {
    let best: { id: string; pct: number; amount: number } | null = null;
    thisCat.forEach((amount, id) => {
      const avgMonth = (prevTotals.get(id) || 0) / monthsWithData;
      const expectedSoFar = (avgMonth * dayOfMonth) / daysInMonth;
      if (expectedSoFar < 50_000 || amount < 50_000) return;
      const pct = Math.round(((amount - expectedSoFar) / expectedSoFar) * 100);
      if (pct >= 20 && (!best || pct > best.pct)) best = { id, pct, amount };
    });
    const spike = best as { id: string; pct: number; amount: number } | null;
    if (spike) {
      insights.push({
        id: `spike-${spike.id}`,
        tone: spike.pct >= 50 ? 'danger' : 'warning',
        icon: 'trend-up',
        title: `Pengeluaran ${catName.get(spike.id) || 'kategori'} naik ${spike.pct}%`,
        description: `Sudah ${formatCurrency(spike.amount)} bulan ini, lebih tinggi dari rata-rata 3 bulan terakhir pada periode yang sama.`,
        priority: 90,
      });
    }
  }

  // 3) Pengeluaran hari ini vs rata-rata harian
  const todayExpense = transactions
    .filter((t) => t.transaction_date === todayISO && t.type === 'expense' && t.status === 'cleared')
    .reduce((s, t) => s + t.amount, 0);
  if (todayExpense > 0 && avgDailyExpense > 0 && todayExpense > avgDailyExpense * 1.5) {
    insights.push({
      id: 'today-high',
      tone: 'warning',
      icon: 'alert',
      title: `Hari ini kamu belanja ${formatCurrency(todayExpense)}`,
      description: `${Math.round(todayExpense / avgDailyExpense)}x lebih banyak dari rata-rata harian bulan ini (${formatCurrency(Math.round(avgDailyExpense))}).`,
      priority: 80,
    });
  }

  // 4) Hari paling boros (90 hari terakhir)
  const since = toISODate(subDays(today, 90));
  const byWeekday = Array.from({ length: 7 }, () => ({ total: 0, days: new Set<string>() }));
  for (const t of transactions) {
    if (t.type !== 'expense' || t.status !== 'cleared' || t.transaction_date < since || t.transaction_date > todayISO) continue;
    const wd = parseISO(t.transaction_date).getDay();
    byWeekday[wd].total += t.amount;
    byWeekday[wd].days.add(t.transaction_date);
  }
  const totalDaysWithSpend = byWeekday.reduce((s, d) => s + d.days.size, 0);
  if (totalDaysWithSpend >= 10) {
    const averages = byWeekday.map((d, i) => ({ i, avg: d.days.size ? d.total / d.days.size : 0 }));
    const top = averages.reduce((a, b) => (b.avg > a.avg ? b : a));
    const overall = byWeekday.reduce((s, d) => s + d.total, 0) / totalDaysWithSpend;
    if (top.avg > overall * 1.25) {
      insights.push({
        id: 'weekday',
        tone: 'info',
        icon: 'calendar',
        title: `Kamu paling boros di hari ${DAYS_OF_WEEK[top.i]}`,
        description: `Rata-rata ${formatCurrency(Math.round(top.avg))} per ${DAYS_OF_WEEK[top.i]}, dibanding ${formatCurrency(Math.round(overall))} di hari lain.`,
        priority: 40,
      });
    }
  }

  // 5) Tagihan rutin 7 hari ke depan
  const in7 = toISODate(addDays(today, 7));
  const upcoming = recurring.filter((r) => r.is_active && r.type === 'expense' && r.next_run_date >= todayISO && r.next_run_date <= in7);
  if (upcoming.length > 0) {
    const total = upcoming.reduce((s, r) => s + r.amount, 0);
    const nearest = upcoming.reduce((a, b) => (a.next_run_date < b.next_run_date ? a : b));
    const days = differenceInCalendarDays(parseISO(nearest.next_run_date), today);
    insights.push({
      id: 'upcoming-bills',
      tone: 'info',
      icon: 'repeat',
      title: `${upcoming.length} tagihan rutin dalam 7 hari (${formatCurrency(total)})`,
      description: `Terdekat: ${nearest.note || catName.get(nearest.category_id || '') || 'tagihan'} ${days === 0 ? 'hari ini' : `dalam ${days} hari`}. Pastikan saldo cukup.`,
      priority: 70,
    });
  }

  // 6) Rasio tabungan bulan ini
  if (thisMonth.income > 0 && dayOfMonth >= 7) {
    const rate = Math.round((thisMonth.net / thisMonth.income) * 100);
    insights.push({
      id: 'savings-rate',
      tone: rate >= 20 ? 'good' : rate >= 0 ? 'warning' : 'danger',
      icon: rate >= 0 ? 'sparkles' : 'trend-down',
      title: rate >= 0 ? `Kamu menyisihkan ${rate}% pemasukan bulan ini` : 'Pengeluaran melebihi pemasukan bulan ini',
      description:
        rate >= 20
          ? 'Mantap! Rasio tabungan di atas 20% termasuk sehat.'
          : rate >= 0
            ? 'Coba targetkan minimal 20% dari pemasukan untuk ditabung.'
            : `Defisit ${formatCurrency(Math.abs(thisMonth.net))}. Cek kategori pengeluaran terbesar di menu Laporan.`,
      priority: rate < 0 ? 95 : 50,
    });
  } else if (thisMonth.income === 0 && thisMonth.expense > 0 && dayOfMonth >= 10) {
    insights.push({
      id: 'no-income',
      tone: 'warning',
      icon: 'alert',
      title: 'Belum ada pemasukan tercatat bulan ini',
      description: 'Catat gaji atau pemasukan lain agar laporan dan proyeksi saldo lebih akurat.',
      priority: 55,
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}
