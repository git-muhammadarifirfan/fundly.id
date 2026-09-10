// ============================================
// Fundly.id — App Layout Component
// ============================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { MobileNav } from '../MobileNav/MobileNav';
import { Header } from '../Header/Header';
import { ScrollProgressBar } from '../../ui/ScrollProgressBar/ScrollProgressBar';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import styles from './AppLayout.module.css';

export const AppLayout: React.FC = () => {
  const isDesktop = useIsDesktop();
  return (
    <div className={styles.appContainer}>
      {/* Top Reading/Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Sidebar Navigation - Visible on Desktop */}
      {isDesktop && <Sidebar />}

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <Header />
        
        <main className={styles.content}>
          <div className={styles.contentInner}>
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation - Visible on Mobile/Tablet */}
        {!isDesktop && <MobileNav />}
      </div>
    </div>
  );
};
