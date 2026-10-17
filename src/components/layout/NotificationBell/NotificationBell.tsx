// ============================================
// Fundly.id - Notification Bell (budget, tagihan rutin, target)
// Notifikasi dihitung real-time dari data keuangan pengguna.
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bell, BellRing, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useFinanceAlerts } from '../../../hooks/useFinanceAlerts';
import { notifyPermission, requestNotifyPermission } from '../../../lib/phoneNotify';
import { cn } from '../../../utils/cn';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  buttonClassName?: string;
  badgeClassName?: string;
  iconSize?: number;
}

function readSeen(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ buttonClassName, badgeClassName, iconSize = 20 }) => {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(notifyPermission);
  const seenKey = `fundly-notif-seen-${userId || 'anon'}`;
  const [seen, setSeen] = useState<Set<string>>(() => readSeen(seenKey));
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSeen(readSeen(seenKey)), [seenKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = useFinanceAlerts();

  const unseenCount = notifications.filter((n) => !seen.has(n.id)).length;

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && unseenCount > 0) {
      const ids = new Set([...seen, ...notifications.map((n) => n.id)]);
      setSeen(ids);
      try {
        // Simpan maksimal 200 id terakhir
        localStorage.setItem(seenKey, JSON.stringify(Array.from(ids).slice(-200)));
      } catch {
        // abaikan
      }
    }
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button className={buttonClassName} aria-label="Notifikasi" onClick={toggle}>
        <Bell size={iconSize} />
        {unseenCount > 0 && <span className={cn(styles.badge, badgeClassName)}>{unseenCount > 9 ? '9+' : unseenCount}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className={styles.panelHeader}>
              <span>Notifikasi</span>
              <span className={styles.count}>{notifications.length}</span>
            </div>
            {permission === 'default' && (
              <button
                type="button"
                className={styles.enablePush}
                onClick={async () => {
                  const result = await requestNotifyPermission();
                  setPermission(result);
                  if (result === 'granted') toast.success('Notifikasi HP aktif');
                  else if (result === 'denied') toast.error('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.');
                }}
              >
                <BellRing size={14} /> Aktifkan notifikasi HP untuk peringatan limit
              </button>
            )}
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <CheckCircle2 size={28} />
                <p>Semua aman! Tidak ada peringatan anggaran atau tagihan saat ini.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.id}
                      className={styles.item}
                      onClick={() => {
                        setIsOpen(false);
                        navigate(n.path);
                      }}
                    >
                      <span className={cn(styles.itemIcon, styles[n.kind])}>
                        <Icon size={16} />
                      </span>
                      <span className={styles.itemText}>
                        <span className={styles.itemTitle}>{n.title}</span>
                        <span className={styles.itemBody}>{n.body}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
