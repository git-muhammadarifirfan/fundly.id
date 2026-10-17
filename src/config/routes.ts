// ============================================
// Fundly.id - Route Path Definitions
// ============================================

export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  REGISTER: '/register',
  RESET_PASSWORD_REQUEST: '/reset-password-request',
  RESET_PASSWORD_CONFIRM: '/reset-password-confirm',
  PRIVACY: '/privacy',
  TERMS: '/terms',

  // Protected routes
  DASHBOARD: '/',
  TRANSACTIONS: '/transactions',
  ADD_TRANSACTION: '/transactions/add',
  EDIT_TRANSACTION: '/transactions/:id/edit',
  BUDGET: '/budget',
  REPORTS: '/reports',
  GOALS: '/goals',
  GOLD: '/gold',
  ACCOUNTS: '/accounts',
  SETTINGS: '/settings',
} as const;

export const editTransactionPath = (id: string) => `/transactions/${id}/edit`;

// Navigation items for sidebar & mobile nav
export const NAV_ITEMS = [
  {
    label: 'Beranda',
    path: ROUTES.DASHBOARD,
    icon: 'layout-dashboard',
  },
  {
    label: 'Transaksi',
    path: ROUTES.TRANSACTIONS,
    icon: 'arrow-left-right',
  },
  {
    label: 'Anggaran',
    path: ROUTES.BUDGET,
    icon: 'wallet',
  },
  {
    label: 'Laporan',
    path: ROUTES.REPORTS,
    icon: 'bar-chart-3',
  },
  {
    label: 'Target',
    path: ROUTES.GOALS,
    icon: 'target',
  },
  {
    label: 'Tabungan Emas',
    path: ROUTES.GOLD,
    icon: 'coins',
  },
  {
    label: 'Akun & Dompet',
    path: ROUTES.ACCOUNTS,
    icon: 'landmark',
  },
] as const;

export const SECONDARY_NAV_ITEMS = [
  {
    label: 'Pengaturan',
    path: ROUTES.SETTINGS,
    icon: 'settings',
  },
] as const;
