// ============================================
// Fundly.id — Currency Formatting Utilities
// Semua nominal di aplikasi disimpan & diproses dalam Rupiah utuh.
// ============================================

import { CURRENCY_LOCALE, CURRENCY_SYMBOL } from '../config/constants';

const numberFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format angka (Rupiah) ke format mata uang Indonesia
 * @example formatCurrency(1200000) → "Rp 1.200.000"
 * @example formatCurrency(50000, { compact: true }) → "Rp 50rb"
 */
export function formatCurrency(
  amount: number,
  options?: {
    compact?: boolean;
    showSymbol?: boolean;
    showSign?: boolean;
  },
): string {
  const { compact = false, showSymbol = true, showSign = false } = options || {};
  const value = Number.isFinite(amount) ? Math.round(amount) : 0;

  const formatted = compact ? formatCompact(value) : numberFormatter.format(Math.abs(value));
  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '-') : value < 0 ? '-' : '';
  const symbol = showSymbol ? `${CURRENCY_SYMBOL} ` : '';

  return `${sign}${symbol}${formatted}`;
}

/**
 * Format angka menjadi compact (50rb, 1,2jt, 3,5M)
 */
export function formatCompact(value: number): string {
  const absValue = Math.abs(value);
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '').replace('.', ',');

  if (absValue >= 1_000_000_000_000) return `${trim(absValue / 1_000_000_000_000)}T`;
  if (absValue >= 1_000_000_000) return `${trim(absValue / 1_000_000_000)}M`;
  if (absValue >= 1_000_000) return `${trim(absValue / 1_000_000)}jt`;
  if (absValue >= 1_000) return `${trim(absValue / 1_000)}rb`;
  return absValue.toString();
}

/**
 * Parse string input ke angka Rupiah
 * @example parseCurrencyInput("1.200.000") → 1200000
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[^\d]/g, '');
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Format input teks Rupiah dengan pemisah ribuan saat user mengetik
 * @example formatRupiahInput("6000000") → "6.000.000"
 */
export function formatRupiahInput(val: string | number): string {
  if (val === null || val === undefined) return '';
  const cleanNum = val.toString().replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!cleanNum) return '';
  return numberFormatter.format(parseInt(cleanNum.slice(0, 15), 10));
}

/**
 * Format angka untuk display di numpad (dengan pemisah ribuan)
 * @example formatNumpadDisplay(1200000) → "1.200.000"
 */
export function formatNumpadDisplay(amount: number): string {
  if (amount === 0) return '0';
  return numberFormatter.format(amount);
}

/**
 * Format persentase
 * @example formatPercentage(0.452) → "45.2%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
