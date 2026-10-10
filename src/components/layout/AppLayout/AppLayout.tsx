// ============================================
// Fundly.id - App Layout Component
// ============================================

import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { MobileNav } from '../MobileNav/MobileNav';
import { Header } from '../Header/Header';
import { ScrollProgressBar } from '../../ui/ScrollProgressBar/ScrollProgressBar';
import { PageSkeleton } from '../../ui/Skeleton/PageSkeleton';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
  const isDesktop = useIsDesktop();
  const { pathname } = useLocation();
  // Form transaksi tampil layar penuh di HP agar numpad tidak tertutup nav bawah
  const isFullscreenForm = pathname === '/transactions/add' || /^\/transactions\/[^/]+\/edit$/.test(pathname);
  const showMobileNav = !isDesktop && !isFullscreenForm;
  return (
    <div className={styles.appContainer}>
      {/* Top Reading/Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Sidebar Navigation - Visible on Desktop */}
      {isDesktop && <Sidebar />}

      {/* Main Content Area */}
      <div className={`${styles.mainWrapper} ${showMobileNav ? '' : styles.noNav}`}>
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
