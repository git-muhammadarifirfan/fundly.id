// ============================================
// Fundly.id — Root Application Component
// ============================================

import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useFinanceStore } from './stores/financeStore';
import { isSupabaseConfigured } from './lib/supabase';

// Layout
import { AppLayout } from './components/layout/AppLayout/AppLayout';
import { PageLoader } from './components/ui/PageLoader/PageLoader';

// Routes config
import { ROUTES } from './config/routes';

// Code-Splitting / Lazy-Loaded Pages
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() => import('./pages/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })));
const AddTransactionPage = lazy(() => import('./pages/transactions/AddTransactionPage').then((m) => ({ default: m.AddTransactionPage })));
const BudgetPage = lazy(() => import('./pages/budget/BudgetPage').then((m) => ({ default: m.BudgetPage })));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const GoalsPage = lazy(() => import('./pages/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const AccountsPage = lazy(() => import('./pages/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

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

// Muat & sinkronkan data keuangan saat user login, bersihkan saat logout
const FinanceSync: React.FC = () => {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (userId) {
      void useFinanceStore.getState().init(userId);
    } else {
      useFinanceStore.getState().reset();
    }
  }, [userId]);

  return null;
};

const App: React.FC = () => {
  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-xl)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            padding: '10px 16px',
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
                <Route path={ROUTES.ACCOUNTS} element={<AccountsPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Default Catch-All Redirect */}
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        )}
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
