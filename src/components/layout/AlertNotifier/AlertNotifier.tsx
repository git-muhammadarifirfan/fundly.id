// ============================================
// Fundly.id - Snackbar & notifikasi HP untuk peringatan baru
// (anggaran hampir habis / terlampaui, tagihan rutin, tenggat target).
// Setiap peringatan hanya diberitahukan sekali per perangkat.
// ============================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { type Toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useFinanceStore } from '../../../stores/financeStore';
import { useFinanceAlerts, type FinanceAlert } from '../../../hooks/useFinanceAlerts';
import { showPhoneNotification } from '../../../lib/phoneNotify';
import { cn } from '../../../utils/cn';
import styles from './AlertNotifier.module.css';

const MAX_PER_BATCH = 3;

function readNotified(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeNotified(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids).slice(-300)));
  } catch {
    // abaikan
  }
}

const AlertSnackbar: React.FC<{ t: Toast; alert: FinanceAlert; onOpen: () => void }> = ({ t, alert, onOpen }) => {
  const Icon = alert.icon;
  return (
    <div className={cn(styles.snackbar, t.visible ? styles.enter : styles.leave)} role="alert">
      <button
        type="button"
        className={styles.body}
        onClick={() => {
          toast.dismiss(t.id);
          onOpen();
        }}
      >
        <span className={cn(styles.icon, styles[alert.kind])}>
          <Icon size={18} />
        </span>
        <span className={styles.text}>
          <span className={styles.app}>Fundly · sekarang</span>
          <span className={styles.title}>{alert.title}</span>
          <span className={styles.desc}>{alert.body}</span>
        </span>
      </button>
      <button type="button" className={styles.close} onClick={() => toast.dismiss(t.id)} aria-label="Tutup notifikasi">
        <X size={14} />
      </button>
    </div>
  );
};

export const AlertNotifier: React.FC = () => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const ready = useFinanceStore((s) => s.status === 'ready');
  const alerts = useFinanceAlerts();

  useEffect(() => {
    if (!userId || !ready) return;
    const key = `fundly-notif-pushed-${userId}`;
    const notified = readNotified(key);
    const fresh = alerts.filter((a) => !notified.has(a.id));
    if (fresh.length === 0) return;

    // Prioritaskan yang paling penting
    const order = { danger: 0, warning: 1, info: 2 } as const;
    const batch = fresh.slice().sort((a, b) => order[a.kind] - order[b.kind]).slice(0, MAX_PER_BATCH);

    batch.forEach((alert, i) => {
      window.setTimeout(() => {
        toast.custom((t) => <AlertSnackbar t={t} alert={alert} onOpen={() => navigate(alert.path)} />, {
          id: alert.id,
          duration: 6000,
        });
        void showPhoneNotification({ id: alert.id, title: alert.title, body: alert.body, url: alert.path });
      }, i * 900);
    });
    try {
      navigator.vibrate?.([40, 30, 40]);
    } catch {
      // tidak didukung
    }

    fresh.forEach((a) => notified.add(a.id));
    writeNotified(key, notified);
  }, [alerts, userId, ready, navigate]);

  return null;
};
