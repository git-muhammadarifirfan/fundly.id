// ============================================
// Fundly.id — Currency Formatting Utilities
// ============================================

import { CURRENCY_LOCALE, CURRENCY_SYMBOL } from '../config/constants';

/**
 * Format angka ke format mata uang Indonesia
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

  // Amount disimpan dalam sen, convert ke rupiah
  const value = amount / 100;

  let formatted: string;

  if (compact) {
    formatted = formatCompact(value);
  } else {
    formatted = new Intl.NumberFormat(CURRENCY_LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  }

  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '-') : value < 0 ? '-' : '';
  const symbol = showSymbol ? `${CURRENCY_SYMBOL} ` : '';

  return `${sign}${symbol}${formatted}`;
}

/**
 * Format angka menjadi compact (50rb, 1,2jt, 3,5M)
 */
function formatCompact(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `${(absValue / 1_000_000_000).toFixed(1).replace('.0', '')}M`;
  }
  if (absValue >= 1_000_000) {
    return `${(absValue / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  }
  if (absValue >= 1_000) {
    return `${(absValue / 1_000).toFixed(1).replace('.0', '')}rb`;
  }
  return absValue.toString();
}

/**
 * Parse string input ke angka (dalam sen)
 * @example parseCurrencyInput("1.200.000") → 120000000
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) * 100 || 0;
}

/**
 * Format angka untuk display di numpad (dengan pemisah ribuan)
 * @example formatNumpadDisplay(1200000) → "1.200.000"
 */
export function formatNumpadDisplay(amount: number): string {
  if (amount === 0) return '0';
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format persentase
 * @example formatPercentage(0.452) → "45.2%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
