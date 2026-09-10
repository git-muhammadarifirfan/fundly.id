// ============================================
// Fundly.id — Date Formatting Utilities
// ============================================

import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { DAYS_OF_WEEK, MONTHS } from '../config/constants';

/**
 * Format tanggal ke format Indonesia
 * @example formatDate("2025-01-23") → "23 Januari 2025"
 */
export function formatDate(dateStr: string, formatStr?: string): string {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
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
 * Format waktu
 * @example formatTime("14:30:00") → "14:30"
 */
export function formatTime(timeStr: string): string {
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
 * @example getDateGroupLabel("2025-01-23") → "Hari ini" / "Kemarin" / "23 Januari 2025"
 */
export function getDateGroupLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  
  if (isToday(date)) return 'Hari Ini';
  if (isYesterday(date)) return 'Kemarin';

  return `${format(date, 'dd', { locale: idLocale })} ${getMonthName(date.getMonth())} ${date.getFullYear()}`;
}

/**
 * Tanggal sekarang format ISO (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Waktu sekarang format HH:mm:ss
 */
export function getCurrentTime(): string {
  return format(new Date(), 'HH:mm:ss');
}

/**
 * Dapatkan rentang tanggal bulan ini
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}
