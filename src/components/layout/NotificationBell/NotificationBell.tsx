// ============================================
// Fundly.id - Notification Bell (budget, tagihan rutin, target)
// Notifikasi dihitung real-time dari data keuangan pengguna.
// ============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, CalendarClock, Target, CheckCircle2 } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useFinanceStore } from '../../../stores/financeStore';
import { useAuthStore } from '../../../stores/authStore';
import { useCategoryMap, useLiveGoals } from '../../../hooks/useFinance';
import { budgetHealth, goalProjection, spentForBudget } from '../../../utils/finance';
import { formatCurrency } from '../../../utils/formatCurrency';
import { ROUTES } from '../../../config/routes';
import { cn } from '../../../utils/cn';
import styles from './NotificationBell.module.css';

interface NotificationItem {
  id: string;
  kind: 'danger' | 'warning' | 'info';
  icon: React.ElementType;
  title: string;
  body: string;
  path: string;
}

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
  const budgets = useFinanceStore((s) => s.budgets);
  const transactions = useFinanceStore((s) => s.transactions);
  const recurring = useFinanceStore((s) => s.recurring);
  const goals = useLiveGoals();
  const categoriesById = useCategoryMap();

  const [isOpen, setIsOpen] = useState(false);
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

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 1. Anggaran bulan ini yang mendekati / melewati limit
    budgets
      .filter((b) => b.month === month && b.year === year)
      .forEach((b) => {
        const spent = spentForBudget(transactions, b);
        const health = budgetHealth(spent, b.amount_limit);
        if (health === 'safe') return;
        const name = categoriesById.get(b.category_id)?.name || 'Kategori';
        const pct = Math.round((spent / b.amount_limit) * 100);
        items.push({
          id: `budget-${b.id}-${health}-${year}-${month}`,
          kind: health === 'over' ? 'danger' : 'warning',
          icon: AlertTriangle,
          title: health === 'over' ? `Anggaran ${name} terlampaui` : `Anggaran ${name} hampir habis`,
          body:
            health === 'over'
              ? `Lewat ${formatCurrency(spent - b.amount_limit)} dari limit ${formatCurrency(b.amount_limit)}.`
              : `Sudah terpakai ${pct}% dari limit ${formatCurrency(b.amount_limit)}.`,
          path: ROUTES.BUDGET,
        });
      });

    // 2. Pengingat transaksi rutin (H-3 s/d hari H)
    recurring
      .filter((r) => r.is_active && r.type === 'expense')
      .forEach((r) => {
        const days = differenceInCalendarDays(parseISO(r.next_run_date), now);
        if (days < 0 || days > 3) return;
        const name = r.note || categoriesById.get(r.category_id || '')?.name || 'Tagihan rutin';
        items.push({
          id: `recurring-${r.id}-${r.next_run_date}`,
          kind: days <= 1 ? 'warning' : 'info',
          icon: CalendarClock,
          title: days === 0 ? `${name} jatuh tempo hari ini` : `${name} jatuh tempo H-${days}`,
          body: `${formatCurrency(r.amount)} akan tercatat otomatis.`,
          path: ROUTES.SETTINGS,
        });
      });

    // 3. Target tabungan mendekati / melewati tenggat
    goals.forEach((g) => {
      const proj = goalProjection(g, now);
      if (proj.achieved || !g.deadline) return;
      const days = differenceInCalendarDays(parseISO(g.deadline), now);
      if (days > 30) return;
      items.push({
        id: `goal-${g.id}-${proj.overdue ? 'overdue' : 'soon'}`,
        kind: proj.overdue ? 'danger' : 'info',
        icon: Target,
        title: proj.overdue ? `Target "${g.name}" melewati tenggat` : `Target "${g.name}" segera jatuh tempo`,
        body: `Masih kurang ${formatCurrency(proj.remaining)} untuk mencapai target.`,
        path: ROUTES.GOALS,
      });
    });

    return items;
  }, [budgets, transactions, recurring, goals, categoriesById]);

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
