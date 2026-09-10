// ============================================
// Fundly.id — Header Component
// ============================================

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import styles from './Header.module.css';

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Lacak & Analisis Keuangan Anda' },
  '/transactions': { title: 'Transaksi', subtitle: 'Riwayat semua transaksi' },
  '/budget': { title: 'Anggaran', subtitle: 'Kelola budget bulanan' },
  '/reports': { title: 'Laporan', subtitle: 'Analisis keuangan Anda' },
  '/accounts': { title: 'Akun', subtitle: 'Kelola dompet & rekening' },
  '/goals': { title: 'Target', subtitle: 'Target tabungan Anda' },
  '/settings': { title: 'Pengaturan', subtitle: 'Konfigurasi aplikasi' },
};

export const Header: React.FC = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Fundly' };

  if (isMobile) {
    return null; // Mobile uses page-level headers
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>{pageInfo.title}</h1>
        {pageInfo.subtitle && (
          <p className={styles.subtitle}>{pageInfo.subtitle}</p>
        )}
      </div>

      <div className={styles.right}>
        {/* Notifications */}

        {/* Notifications */}
        <button className={styles.iconButton} aria-label="Notifikasi" id="header-notifications">
          <Bell size={20} />
          <span className={styles.notifBadge} />
        </button>

        {/* User Avatar */}
        <button className={styles.userButton} id="header-user-menu">
          <div className={styles.avatar}>
            <User size={18} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Pengguna</span>
            <span className={styles.userRole}>Personal</span>
          </div>
        </button>
      </div>
    </header>
  );
};
