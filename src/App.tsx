// ============================================
// Fundly.id — Root Application Component
// ============================================

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

// Layout
import { AppLayout } from './components/layout/AppLayout/AppLayout';

// Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { AddTransactionPage } from './pages/transactions/AddTransactionPage';
import { BudgetPage } from './pages/budget/BudgetPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { GoalsPage } from './pages/goals/GoalsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Routes config
import { ROUTES } from './config/routes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-dark)',
            color: 'var(--color-text-on-dark)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            padding: '12px 20px',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-primary)',
              secondary: 'var(--color-dark)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: 'white',
            },
          },
        }}
      />

      <AnimatePresence mode="wait">
        <Routes>
          {/* App Layout wraps all protected routes */}
          <Route element={<AppLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />
            <Route path={ROUTES.ADD_TRANSACTION} element={<AddTransactionPage />} />
            <Route path={ROUTES.BUDGET} element={<BudgetPage />} />
            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
            <Route path={ROUTES.GOALS} element={<GoalsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          </Route>
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
};

export default App;
