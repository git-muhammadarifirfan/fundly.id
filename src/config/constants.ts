// ============================================
// Fundly.id — Application Constants
// ============================================

export const APP_NAME = 'Fundly';
export const APP_DESCRIPTION = 'Aplikasi Pencatatan Keuangan Pribadi';
export const APP_VERSION = '1.0.0';

// Currency
export const DEFAULT_CURRENCY = 'IDR';
export const CURRENCY_SYMBOL = 'Rp';
export const CURRENCY_LOCALE = 'id-ID';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Date formats
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATE_FORMAT_LONG = 'dd MMMM yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// Breakpoints (matches CSS)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

// Transaction statuses
export const TRANSACTION_STATUSES = {
  CLEARED: 'cleared',
  PENDING: 'pending',
} as const;

// Account types
export const ACCOUNT_TYPES = {
  CASH: 'cash',
  BANK: 'bank',
  EWALLET: 'ewallet',
  CREDIT_CARD: 'credit_card',
} as const;

// Recurring frequencies
export const RECURRING_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

// Budget status thresholds
export const BUDGET_THRESHOLDS = {
  SAFE: 0.6,        // 0-60% = hijau
  WARNING: 0.8,     // 60-80% = kuning
  DANGER: 1.0,      // 80-100% = merah
} as const;

// Default category colors
export const CATEGORY_COLORS = [
  '#C6E83B', // Lime green
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Sage
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#FF9500', // Orange
  '#5AC8FA', // Sky blue
  '#AF52DE', // Purple
  '#FF2D55', // Pink
] as const;

// Default category icons
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Makanan & Minuman', icon: 'utensils', color: '#FF6B6B' },
  { name: 'Transportasi', icon: 'car', color: '#45B7D1' },
  { name: 'Belanja', icon: 'shopping-bag', color: '#DDA0DD' },
  { name: 'Hiburan', icon: 'gamepad-2', color: '#96CEB4' },
  { name: 'Kesehatan', icon: 'heart-pulse', color: '#FF2D55' },
  { name: 'Pendidikan', icon: 'graduation-cap', color: '#5AC8FA' },
  { name: 'Tagihan & Utilitas', icon: 'zap', color: '#FFEAA7' },
  { name: 'Rumah Tangga', icon: 'home', color: '#98D8C8' },
  { name: 'Pakaian', icon: 'shirt', color: '#AF52DE' },
  { name: 'Olahraga', icon: 'dumbbell', color: '#4ECDC4' },
  { name: 'Langganan', icon: 'repeat', color: '#FF9500' },
  { name: 'Lainnya', icon: 'more-horizontal', color: '#6E6E73' },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Gaji', icon: 'briefcase', color: '#C6E83B' },
  { name: 'Freelance', icon: 'laptop', color: '#4ECDC4' },
  { name: 'Investasi', icon: 'trending-up', color: '#45B7D1' },
  { name: 'Bonus', icon: 'gift', color: '#FF9500' },
  { name: 'Penjualan', icon: 'store', color: '#96CEB4' },
  { name: 'Lainnya', icon: 'more-horizontal', color: '#6E6E73' },
] as const;

// Days of week (Indonesian)
export const DAYS_OF_WEEK = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
] as const;

// Months (Indonesian)
export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;
