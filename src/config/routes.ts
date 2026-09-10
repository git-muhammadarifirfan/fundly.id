// ============================================
// Fundly.id — Route Path Definitions
// ============================================

export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  REGISTER: '/register',

  // Protected routes
  DASHBOARD: '/',
  TRANSACTIONS: '/transactions',
  ADD_TRANSACTION: '/transactions/add',
  EDIT_TRANSACTION: '/transactions/:id/edit',
  BUDGET: '/budget',
  REPORTS: '/reports',
  GOALS: '/goals',
  SETTINGS: '/settings',
} as const;

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
] as const;

export const SECONDARY_NAV_ITEMS = [
  {
    label: 'Pengaturan',
    path: ROUTES.SETTINGS,
    icon: 'settings',
  },
] as const;
