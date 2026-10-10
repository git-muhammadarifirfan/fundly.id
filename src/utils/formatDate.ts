// ============================================
// Fundly.id — Date Formatting Utilities
// Semua tanggal transaksi memakai tanggal LOKAL perangkat (bukan UTC).
// ============================================

import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { DAYS_OF_WEEK, MONTHS } from '../config/constants';

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'] as const;

/** Format Date ke ISO lokal (yyyy-MM-dd) */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format tanggal ke format Indonesia
 * @example formatDate("2025-01-23") → "23 Januari 2025"
 */
export function formatDate(dateStr: string, formatStr?: string): string {
  const date = parseISO(dateStr);
  return format(date, formatStr || 'dd MMMM yyyy', { locale: idLocale });
}

/**
 * Format tanggal pendek
 * @example formatDateShort("2025-01-23") → "23/01/25"
 */
export function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'dd/MM/yy', { locale: idLocale });
}

/**
 * Format tanggal lengkap dengan nama hari
 * @example formatDateLong("2025-01-23") → "Kamis, 23 Januari 2025"
 */
export function formatDateLong(dateStr: string): string {
  const date = parseISO(dateStr);
  return `${DAYS_OF_WEEK[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format waktu
 * @example formatTime("14:30:00") → "14:30"
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  return `${hours}:${minutes}`;
}

/**
 * Format tanggal relatif
 * @example formatRelativeDate("2025-01-23") → "2 hari yang lalu"
 */
export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);

  if (isToday(date)) return 'Hari ini';
  if (isYesterday(date)) return 'Kemarin';
  if (isTomorrow(date)) return 'Besok';

  return formatDistanceToNow(date, { addSuffix: true, locale: idLocale });
}

/**
 * Dapatkan nama hari dalam bahasa Indonesia
 * @example getDayName("2025-01-23") → "Kamis"
 */
export function getDayName(dateStr: string): string {
  const date = parseISO(dateStr);
  return DAYS_OF_WEEK[date.getDay()];
}

/**
 * Dapatkan nama bulan dalam bahasa Indonesia
 * @example getMonthName(0) → "Januari"
 */
export function getMonthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}

/**
 * Format tanggal untuk header group
 * @example getDateGroupLabel("2025-01-23") → "Hari Ini" / "Kemarin" / "Kamis, 23 Januari 2025"
 */
export function getDateGroupLabel(dateStr: string): string {
  const date = parseISO(dateStr);

  if (isToday(date)) return 'Hari Ini';
  if (isYesterday(date)) return 'Kemarin';

  return formatDateLong(dateStr);
}

/**
 * Tanggal sekarang format ISO lokal (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Waktu sekarang format HH:mm
 */
export function getCurrentTime(): string {
  return format(new Date(), 'HH:mm');
}

/**
 * Rentang tanggal sebuah bulan (month 0-11)
 */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

/**
 * Dapatkan rentang tanggal bulan ini
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth());
}

/** Label bulan-tahun, mis. "Oktober 2026" */
export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}
