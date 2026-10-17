// ============================================
// Fundly.id - App Layout Component
// ============================================

import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { MobileNav } from '../MobileNav/MobileNav';
import { Header } from '../Header/Header';
import { OfflineBanner } from '../OfflineBanner/OfflineBanner';
import { AlertNotifier } from '../AlertNotifier/AlertNotifier';
import { ScrollProgressBar } from '../../ui/ScrollProgressBar/ScrollProgressBar';
import { PageSkeleton } from '../../ui/Skeleton/PageSkeleton';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
  const isDesktop = useIsDesktop();
  const showMobileNav = !isDesktop;
  return (
    <div className={styles.appContainer}>
      {/* Progress bar scroll hanya di desktop (di HP mengganggu area status bar) */}
      {isDesktop && <ScrollProgressBar />}
      <OfflineBanner />
      <AlertNotifier />

      {/* Sidebar Navigation - Visible on Desktop */}
      {isDesktop && <Sidebar />}

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <Header />

        <main className={styles.content}>
          <div className={styles.contentInner}>
            {/* Sidebar & header tetap tampil; hanya konten yang menampilkan skeleton saat halaman dimuat */}
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        {/* Mobile Bottom Navigation - Visible on Mobile/Tablet */}
        {showMobileNav && <MobileNav />}
      </div>
    </div>
  );
};
