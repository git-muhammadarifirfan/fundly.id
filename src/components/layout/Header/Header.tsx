// ============================================
// Fundly.id - Header Component
// ============================================

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { UserDropdown } from '../UserDropdown/UserDropdown';
import { NotificationBell } from '../NotificationBell/NotificationBell';
import styles from './Header.module.css';

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Lacak & Analisis Keuangan Anda' },
  '/transactions': { title: 'Transaksi', subtitle: 'Riwayat semua transaksi' },
  '/transactions/add': { title: 'Tambah Transaksi', subtitle: 'Catat pemasukan, pengeluaran, atau transfer' },
  '/budget': { title: 'Anggaran', subtitle: 'Kelola budget bulanan' },
  '/reports': { title: 'Laporan', subtitle: 'Analisis keuangan Anda' },
  '/accounts': { title: 'Akun & Dompet', subtitle: 'Kelola dompet & rekening' },
  '/goals': { title: 'Target', subtitle: 'Target tabungan Anda' },
  '/settings': { title: 'Pengaturan', subtitle: 'Konfigurasi aplikasi' },
};

export const Header: React.FC = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const pageInfo =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.endsWith('/edit') ? { title: 'Edit Transaksi', subtitle: 'Perbarui detail transaksi' } : { title: 'Fundly' });

  if (isMobile) {
    return null; // Mobile uses page-level headers
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>{pageInfo.title}</h1>
        {pageInfo.subtitle && <p className={styles.subtitle}>{pageInfo.subtitle}</p>}
      </div>

      <div className={styles.right}>
        {/* Notifications */}
        <NotificationBell buttonClassName={styles.iconButton} />

        {/* User Dropdown */}
        <UserDropdown />
      </div>
    </header>
  );
};
