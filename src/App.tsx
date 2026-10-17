// ============================================
// Fundly.id - Root Application Component
// ============================================

import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import { useAuthStore } from './stores/authStore';
import { useFinanceStore } from './stores/financeStore';
import { useGoldStore } from './stores/goldStore';
import { isSupabaseConfigured } from './lib/supabase';
import { useIsMobile } from './hooks/useMediaQuery';
import { usePerfStore, isLiteMode } from './stores/perfStore';

// Layout
import { AppLayout } from './components/layout/AppLayout/AppLayout';
import { PageLoader } from './components/ui/PageLoader/PageLoader';

// Routes config
import { ROUTES } from './config/routes';

// Code-Splitting / Lazy-Loaded Pages
// Loader dipisah agar bisa di-prefetch saat browser idle (pindah menu terasa instan)
const pageLoaders = {
  dashboard: () => import('./pages/dashboard/DashboardPage'),
  transactions: () => import('./pages/transactions/TransactionsPage'),
  addTransaction: () => import('./pages/transactions/AddTransactionPage'),
  budget: () => import('./pages/budget/BudgetPage'),
  goals: () => import('./pages/goals/GoalsPage'),
  gold: () => import('./pages/gold/GoldPage'),
  accounts: () => import('./pages/accounts/AccountsPage'),
  settings: () => import('./pages/settings/SettingsPage'),
  reports: () => import('./pages/reports/ReportsPage'),
};

const DashboardPage = lazy(() => pageLoaders.dashboard().then((m) => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() => pageLoaders.transactions().then((m) => ({ default: m.TransactionsPage })));
const AddTransactionPage = lazy(() => pageLoaders.addTransaction().then((m) => ({ default: m.AddTransactionPage })));
const BudgetPage = lazy(() => pageLoaders.budget().then((m) => ({ default: m.BudgetPage })));
const ReportsPage = lazy(() => pageLoaders.reports().then((m) => ({ default: m.ReportsPage })));
const GoalsPage = lazy(() => pageLoaders.goals().then((m) => ({ default: m.GoalsPage })));
const GoldPage = lazy(() => pageLoaders.gold().then((m) => ({ default: m.GoldPage })));
const AccountsPage = lazy(() => pageLoaders.accounts().then((m) => ({ default: m.AccountsPage })));
const SettingsPage = lazy(() => pageLoaders.settings().then((m) => ({ default: m.SettingsPage })));

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ResetPasswordRequestPage = lazy(() => import('./pages/auth/ResetPasswordRequestPage').then((m) => ({ default: m.ResetPasswordRequestPage })));
const ResetPasswordConfirmPage = lazy(() => import('./pages/auth/ResetPasswordConfirmPage').then((m) => ({ default: m.ResetPasswordConfirmPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/legal/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })));
const ConfigErrorPage = lazy(() => import('./pages/auth/ConfigErrorPage').then((m) => ({ default: m.ConfigErrorPage })));

interface RedirectState {
  from?: string;
}

// Protected Route Guard (Redirects to Login if NOT authenticated)
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, isPasswordRecovery } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <PageLoader message="Memeriksa sesi Anda..." />;
  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={ROUTES.LOGIN} replace state={from !== '/' ? ({ from } satisfies RedirectState) : undefined} />;
  }
  if (isPasswordRecovery) return <Navigate to={ROUTES.RESET_PASSWORD_CONFIRM} replace />;

  return <Outlet />;
};

// Public Auth Route Guard (Redirects to Dashboard if ALREADY authenticated)
const PublicAuthRoute: React.FC = () => {
  const { isAuthenticated, isLoading, isPasswordRecovery } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <PageLoader message="Memeriksa sesi Anda..." />;
  if (isAuthenticated) {
    if (isPasswordRecovery) return <Navigate to={ROUTES.RESET_PASSWORD_CONFIRM} replace />;
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from && from.startsWith('/') ? from : ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
};

/** Prefetch halaman lain saat browser idle, kecuali koneksi lambat / mode hemat data. */
function prefetchPagesWhenIdle(): () => void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  // HP spesifikasi rendah / Mode Ringan: jangan muat halaman lain di latar belakang (hemat RAM & CPU)
  if (isLiteMode() || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return () => undefined;

  const loaders = Object.values(pageLoaders);
  const schedule =
    window.requestIdleCallback?.bind(window) ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({} as IdleDeadline), 1500));
  const cancel = window.cancelIdleCallback?.bind(window) ?? window.clearTimeout.bind(window);

  let index = 0;
  let handle = 0;
  const next = () => {
    const load = loaders[index++];
    if (!load) return;
    load()
      .catch(() => undefined)
      .finally(() => {
        handle = schedule(next, { timeout: 4000 });
      });
  };
  handle = schedule(next, { timeout: 4000 });
  return () => cancel(handle);
}

// Muat & sinkronkan data keuangan saat user login, bersihkan saat logout
const FinanceSync: React.FC = () => {
  const userId = useAuthStore((s) => s.user?.id);
  const financeReady = useFinanceStore((s) => s.status === 'ready');

  useEffect(() => {
    if (!userId || !financeReady) return;
    return prefetchPagesWhenIdle();
  }, [userId, financeReady]);

  useEffect(() => {
    if (userId) {
      void useFinanceStore.getState().init(userId);
    } else {
      useFinanceStore.getState().reset();
      useGoldStore.getState().reset();
    }
  }, [userId]);

  return null;
};

const App: React.FC = () => {
  const isMobile = useIsMobile();
  const lite = usePerfStore((s) => s.lite);
  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      {/* Di HP: tengah atas, di bawah status bar/notch; di desktop: kanan atas */}
      <Toaster
        position={isMobile ? 'top-center' : 'top-right'}
        containerStyle={isMobile ? { top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16, right: 16 } : undefined}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-xl)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            padding: '10px 16px',
            maxWidth: isMobile ? '100%' : 380,
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
            letterSpacing: '-0.01em',
          },
          success: {
            style: {
              background: 'var(--color-primary-subtle, #F4FAD2)',
              color: 'var(--color-dark, #1C1C1E)',
              border: '1px solid rgba(198, 232, 59, 0.4)',
              fontWeight: 600,
            },
            iconTheme: {
              primary: '#A3D900',
              secondary: 'var(--color-dark, #1C1C1E)',
            },
          },
          error: {
            duration: 4500,
            style: {
              background: '#FFF5F5',
              color: '#E53E3E',
              border: '1px solid #FEB2B2',
              fontWeight: 600,
            },
            iconTheme: {
              primary: '#E53E3E',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      {isSupabaseConfigured && <FinanceSync />}

      {/* Mode Ringan: matikan animasi framer-motion; selain itu ikuti pengaturan "kurangi gerakan" OS */}
      <MotionConfig reducedMotion={lite ? 'always' : 'user'}>
      <Suspense fallback={<PageLoader />}>
        {!isSupabaseConfigured ? (
          <ConfigErrorPage />
        ) : (
          <Routes>
            {/* Public Auth Routes - Only accessible when NOT logged in */}
            <Route element={<PublicAuthRoute />}>
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
              <Route path={ROUTES.RESET_PASSWORD_REQUEST} element={<ResetPasswordRequestPage />} />
            </Route>

            {/* Halaman legal: publik, bisa dibuka dengan atau tanpa login */}
            <Route path={ROUTES.PRIVACY} element={<PrivacyPolicyPage />} />
            <Route path={ROUTES.TERMS} element={<TermsPage />} />

            {/* Reset password: diakses lewat tautan email (sesi recovery) */}
            <Route path={ROUTES.RESET_PASSWORD_CONFIRM} element={<ResetPasswordConfirmPage />} />

            {/* Protected routes - Only accessible when logged in */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />
                <Route path={ROUTES.ADD_TRANSACTION} element={<AddTransactionPage />} />
                <Route path={ROUTES.EDIT_TRANSACTION} element={<AddTransactionPage />} />
                <Route path={ROUTES.BUDGET} element={<BudgetPage />} />
                <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
                <Route path={ROUTES.GOALS} element={<GoalsPage />} />
                <Route path={ROUTES.GOLD} element={<GoldPage />} />
                <Route path={ROUTES.ACCOUNTS} element={<AccountsPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Default Catch-All Redirect */}
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        )}
      </Suspense>
      </MotionConfig>
    </BrowserRouter>
  );
};

export default App;
