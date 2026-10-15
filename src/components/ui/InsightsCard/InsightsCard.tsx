// ============================================
// Fundly.id - Kartu Wawasan Keuangan (insight otomatis, realtime)
// ============================================

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Lightbulb, Repeat, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useFinanceStore } from '../../../stores/financeStore';
import { buildInsights, type Insight } from '../../../utils/insights';
import { cn } from '../../../utils/cn';
import styles from './InsightsCard.module.css';

const ICONS: Record<Insight['icon'], React.ElementType> = {
  'trend-up': TrendingUp,
  'trend-down': TrendingDown,
  calendar: CalendarDays,
  wallet: Wallet,
  alert: AlertTriangle,
  sparkles: Sparkles,
  repeat: Repeat,
};

interface InsightsCardProps {
  limit?: number;
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ limit = 3 }) => {
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const recurring = useFinanceStore((s) => s.recurring);
  const [expanded, setExpanded] = useState(false);

  const insights = useMemo(
    () => buildInsights({ transactions, categories, accounts, recurring }),
    [transactions, categories, accounts, recurring],
  );

  if (insights.length === 0) return null;
  const visible = expanded ? insights : insights.slice(0, limit);

  return (
    <section className={styles.card} aria-label="Wawasan keuangan">
      <div className={styles.header}>
        <span className={styles.badge}>
          <Lightbulb size={14} /> Wawasan Keuangan
        </span>
        {insights.length > limit && (
          <button type="button" className={styles.more} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Ringkas' : `Lihat semua (${insights.length})`}
          </button>
        )}
      </div>
      <ul className={styles.list}>
        {visible.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.id} className={styles.item}>
              <span className={cn(styles.icon, styles[item.tone])}>
                <Icon size={16} />
              </span>
              <span className={styles.text}>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.desc}>{item.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
