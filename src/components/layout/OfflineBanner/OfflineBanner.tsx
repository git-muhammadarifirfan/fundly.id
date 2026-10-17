// ============================================
// Fundly.id - Indikator mode offline & sinkronisasi antrian
// ============================================

import React, { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../../../stores/financeStore';
import styles from './OfflineBanner.module.css';

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export const OfflineBanner: React.FC = () => {
  const online = useOnline();
  const pendingCount = useFinanceStore((s) => s.pendingCount);
  const isSyncing = useFinanceStore((s) => s.isSyncing);

  if (online && !isSyncing) return null;

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.pill}>
        {online ? <RefreshCw size={14} className={styles.spin} /> : <CloudOff size={14} />}
        <span>
          {online
            ? `Menyinkronkan ${pendingCount} perubahan...`
            : pendingCount > 0
              ? `Mode offline · ${pendingCount} belum tersinkron`
              : 'Mode offline · transaksi tetap bisa dicatat'}
        </span>
      </div>
    </div>
  );
};
