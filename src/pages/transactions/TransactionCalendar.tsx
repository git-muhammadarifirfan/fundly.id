// ============================================
// Fundly.id - Kalender Transaksi (ringkasan masuk/keluar per tanggal)
// ============================================

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { formatCompact, formatCurrency } from '../../utils/formatCurrency';
import { formatMonthYear, getTodayISO, toISODate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import type { Transaction } from '../../types/models';
import styles from './TransactionCalendar.module.css';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

interface DaySummary {
  income: number;
  expense: number;
  transfers: number;
}

interface TransactionCalendarProps {
  transactions: Transaction[];
  onSelectDay: (dateISO: string) => void;
}

export const TransactionCalendar: React.FC<TransactionCalendarProps> = ({ transactions, onSelectDay }) => {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const todayISO = getTodayISO();

  const { days, totals } = useMemo(() => {
    const start = toISODate(month);
    const end = toISODate(endOfMonth(month));
    const map = new Map<string, DaySummary>();
    const sum = { income: 0, expense: 0 };
    for (const t of transactions) {
      if (t.status !== 'cleared' || t.transaction_date < start || t.transaction_date > end) continue;
      const d = map.get(t.transaction_date) ?? { income: 0, expense: 0, transfers: 0 };
      if (t.type === 'income') {
        d.income += t.amount;
        sum.income += t.amount;
      } else if (t.type === 'expense') {
        d.expense += t.amount;
        sum.expense += t.amount;
      } else d.transfers += 1;
      map.set(t.transaction_date, d);
    }

    // Grid dimulai hari Senin
    const leading = (month.getDay() + 6) % 7;
    const daysInMonth = endOfMonth(month).getDate();
    const cells: ({ iso: string; day: number; summary?: DaySummary } | null)[] = Array(leading).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toISODate(new Date(month.getFullYear(), month.getMonth(), day));
      cells.push({ iso, day, summary: map.get(iso) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return { days: cells, totals: sum };
  }, [transactions, month]);

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button type="button" className={styles.navBtn} onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Bulan sebelumnya">
          <ChevronLeft size={18} />
        </button>
        <div className={styles.headerCenter}>
          <span className={styles.monthLabel}>{formatMonthYear(month.getFullYear(), month.getMonth())}</span>
          <span className={styles.monthTotals}>
            <span className={styles.income}>+{formatCurrency(totals.income, { compact: true })}</span>
            <span className={styles.expense}>-{formatCurrency(totals.expense, { compact: true })}</span>
          </span>
        </div>
        <button type="button" className={styles.navBtn} onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Bulan berikutnya">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
        {days.map((cell, i) =>
          cell ? (
            <button
              key={cell.iso}
              type="button"
              className={cn(styles.day, cell.iso === todayISO && styles.today, Boolean(cell.summary) && styles.hasData)}
              onClick={() => onSelectDay(cell.iso)}
              aria-label={`Lihat transaksi tanggal ${cell.day}`}
            >
              <span className={styles.dayNumber}>{cell.day}</span>
              {cell.summary?.income ? <span className={styles.income}>+{formatCompact(cell.summary.income)}</span> : null}
              {cell.summary?.expense ? <span className={styles.expense}>-{formatCompact(cell.summary.expense)}</span> : null}
              {cell.summary && !cell.summary.income && !cell.summary.expense && cell.summary.transfers ? (
                <span className={styles.transferDot} aria-label="Ada transfer" />
              ) : null}
            </button>
          ) : (
            <span key={`empty-${i}`} className={styles.empty} />
          ),
        )}
      </div>

      <div className={styles.legend}>
        <span>
          <i className={styles.legendIncome} /> Masuk
        </span>
        <span>
          <i className={styles.legendExpense} /> Keluar
        </span>
        <span>
          <i className={styles.legendTransfer} /> Transfer
        </span>
        <span className={styles.hint}>Ketuk tanggal untuk melihat detail</span>
      </div>
    </div>
  );
};
