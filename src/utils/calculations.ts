// ============================================
// Fundly.id — Financial Calculations
// ============================================

import type { BudgetStatus } from '../types/common';
import { BUDGET_THRESHOLDS } from '../config/constants';

/**
 * Hitung status budget berdasarkan usage percentage
 */
export function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return 'safe';
  const ratio = spent / limit;
  
  if (ratio > BUDGET_THRESHOLDS.DANGER) return 'exceeded';
  if (ratio > BUDGET_THRESHOLDS.WARNING) return 'danger';
  if (ratio > BUDGET_THRESHOLDS.SAFE) return 'warning';
  return 'safe';
}

/**
 * Hitung persentase perubahan
 * @example calculateChange(12000, 10000) → 0.2 (20%)
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0;
  return (current - previous) / previous;
}

/**
 * Hitung proyeksi tanggal target tabungan tercapai
 */
export function calculateGoalProjection(
  currentAmount: number,
  targetAmount: number,
  monthlyRate: number,
): Date | null {
  if (monthlyRate <= 0 || currentAmount >= targetAmount) return null;
  
  const remaining = targetAmount - currentAmount;
  const monthsNeeded = Math.ceil(remaining / monthlyRate);
  
  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded);
  
  return projectedDate;
}

/**
 * Hitung rata-rata pengeluaran per hari
 */
export function calculateDailyAverage(totalAmount: number, days: number): number {
  if (days <= 0) return 0;
  return Math.round(totalAmount / days);
}

/**
 * Hitung net worth (total aset - total utang)
 */
export function calculateNetWorth(
  assets: number,
  liabilities: number,
): { netWorth: number; ratio: number } {
  const netWorth = assets - liabilities;
  const ratio = assets > 0 ? netWorth / assets : 0;
  return { netWorth, ratio };
}
