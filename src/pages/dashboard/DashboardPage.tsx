// ============================================
// Fundly.id — Dashboard Page
// ============================================

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Wallet,
  ChevronDown,
  MoreHorizontal,
  Utensils,
  Briefcase,
  Car,
  ShoppingCart,
  Building2,
  GraduationCap,
  Palmtree,
} from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useCountUp } from '../../hooks/useAnimations';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateShort } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import { ROUTES } from '../../config/routes';
import { MONTHS } from '../../config/constants';
import styles from './DashboardPage.module.css';

// ---- Demo Data ----
const DEMO_CASH = 120000000;    // Rp 1.200.000 (Tunai)
const DEMO_BANK = 8500000000;   // Rp 85.000.000 (Bank)
const DEMO_BALANCE = DEMO_CASH + DEMO_BANK; // Total Saldo (Cash + Bank = Rp 86.200.000)

const DEMO_INCOME = 250000000;  // Rp 2.500.000
const DEMO_EXPENSE = 130000000; // Rp 1.300.000

const DEMO_WEEKLY = [
  { day: 'Min', amount: 30 },
  { day: 'Sen', amount: 45 },
  { day: 'Sel', amount: 65 },
  { day: 'Rab', amount: 50 },
  { day: 'Kam', amount: 80 },
  { day: 'Jum', amount: 40 },
  { day: 'Sab', amount: 90 },
];

const DEMO_TRANSACTIONS = [
  { id: '1', amount: -5000000, category: 'Makanan', subcategory: 'Makan siang resto', type: 'expense' as const, date: '2025-01-23', icon: Utensils },
  { id: '2', amount: 20000000, category: 'Freelance', subcategory: 'Project Client web redesign', type: 'income' as const, date: '2025-01-22', icon: Briefcase },
  { id: '3', amount: -5000000, category: 'Makanan', subcategory: 'Belanja bahan makanan', type: 'expense' as const, date: '2025-01-22', icon: Utensils },
  { id: '4', amount: -2500000, category: 'Transportasi', subcategory: 'Bensin & Tol Cipularang', type: 'expense' as const, date: '2025-01-22', icon: Car },
  { id: '5', amount: -3500000, category: 'Belanja', subcategory: 'Baju & sepatu kerja', type: 'expense' as const, date: '2025-01-21', icon: ShoppingCart },
];

const DEMO_CATEGORIES_SPENDING = [
  { name: 'Makanan', percentage: 30, color: '#FF6B6B' },
  { name: 'Belanja', percentage: 20, color: '#DDA0DD' },
  { name: 'Transport', percentage: 20, color: '#45B7D1' },
  { name: 'Langganan', percentage: 15, color: '#FF9500' },
  { name: 'Kafe', percentage: 10, color: '#96CEB4' },
  { name: 'Utilitas', percentage: 5, color: '#FFEAA7' },
];

const DEMO_SAVINGS = [
  { name: 'Tabungan Darurat', current: 800000000, target: 2000000000, percentage: 50, icon: Building2, color: '#C6E83B' },
  { name: 'Dana Pendidikan', current: 800000000, target: 2000000000, percentage: 32, icon: GraduationCap, color: '#5AC8FA' },
  { name: 'Dana Pensiun', current: 800000000, target: 2000000000, percentage: 9, icon: Palmtree, color: '#FF9500' },
];

const DEMO_CASHFLOW = [
  { month: 'Jan', income: 320, expense: 180 },
  { month: 'Feb', income: 280, expense: 220 },
  { month: 'Mar', income: 350, expense: 200 },
  { month: 'Apr', income: 300, expense: 250 },
  { month: 'Mei', income: 280, expense: 190 },
  { month: 'Jun', income: 324, expense: 243 },
  { month: 'Jul', income: 310, expense: 220 },
  { month: 'Ags', income: 290, expense: 260 },
  { month: 'Sep', income: 340, expense: 200 },
  { month: 'Okt', income: 300, expense: 230 },
  { month: 'Nov', income: 280, expense: 210 },
  { month: 'Des', income: 350, expense: 190 },
];

export const DashboardPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const cardsRef = useRef<HTMLDivElement>(null);
  const balanceRef = useCountUp(DEMO_BALANCE / 100, 1.2, 0.2);
  const currentMonth = MONTHS[new Date().getMonth()];

  // GSAP stagger animation on mount
  useEffect(() => {
    if (!cardsRef.current) return;
    const cards = cardsRef.current.querySelectorAll('[data-animate]');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'all',
      },
    );
  }, []);

  if (isMobile) {
    return <MobileDashboard balanceRef={balanceRef} currentMonth={currentMonth} navigate={navigate} />;
  }

  return <DesktopDashboard cardsRef={cardsRef} balanceRef={balanceRef} currentMonth={currentMonth} navigate={navigate} />;
};

// ============================================
// Mobile Dashboard
// ============================================
const MobileDashboard: React.FC<{
  balanceRef: React.RefObject<HTMLElement | null>;
  currentMonth: string;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ balanceRef, currentMonth, navigate }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const bars = chartRef.current.querySelectorAll(`.${styles.weeklyBar}`);
    gsap.fromTo(
      bars,
      { scaleY: 0, transformOrigin: 'bottom' },
      { scaleY: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out', delay: 0.5 },
    );
  }, []);

  return (
    <div className={styles.mobileDashboard}>
      {/* Mobile Header */}
      <div className={styles.mobileHeader}>
        <div className={styles.userGreeting}>
          <div className={styles.mobileAvatar}>
            <span>👤</span>
          </div>
          <div>
            <h2 className={styles.greetingName}>Pengguna</h2>
            <p className={styles.greetingRole}>Personal</p>
          </div>
        </div>
        <button className={styles.notifBtn} aria-label="Notifikasi">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </button>
      </div>

      {/* Balance Card Mobile (100% Exact Screenshot Match) */}
      <Card variant="primary" padding="lg" className={styles.balanceCard}>
        <div className={styles.balanceHeader}>
          <span className={styles.balanceLabel}>Balance</span>
          <span className={styles.monthBadge}>{currentMonth}</span>
        </div>
        <div className={styles.balanceAmount}>
          <span className={styles.currencyPrefix}>Rp.</span>
          <span className={styles.balanceValue} ref={balanceRef as React.RefObject<HTMLSpanElement>}>0</span>
        </div>

        <div className={styles.balanceDetails}>
          <div className={styles.balanceStatsGroup}>
            <div className={styles.balanceItem}>
              <span className={styles.balanceItemLabel}>Income</span>
              <span className={styles.balanceItemValue}>
                {formatCurrency(DEMO_INCOME)}
              </span>
            </div>
            <div className={styles.balanceItem}>
              <span className={styles.balanceItemLabel}>Expenses</span>
              <span className={styles.balanceItemValue}>
                {formatCurrency(DEMO_EXPENSE)}
              </span>
            </div>
          </div>
          <Button
            variant="dark"
            size="sm"
            className={styles.addTransactionBtn}
            onClick={() => navigate(ROUTES.ADD_TRANSACTION)}
          >
            Add Transacation
          </Button>
        </div>
      </Card>

      {/* Card Panjang Putih Konsisten untuk Dompet Tunai & Bank */}
      <Card padding="md" className={styles.accountsCardMobile}>
        <div className={styles.accountColItem}>
          <div className={styles.accountColHeader}>
            <Wallet size={16} className={styles.accountIcon} />
            <span className={styles.accountColTitle}>Tunai (Cash)</span>
          </div>
          <span className={styles.accountColValue}>{formatCurrency(DEMO_CASH)}</span>
        </div>

        <div className={styles.accountColDivider} />

        <div className={styles.accountColItem}>
          <div className={styles.accountColHeader}>
            <Building2 size={16} className={styles.accountIcon} />
            <span className={styles.accountColTitle}>Bank</span>
          </div>
          <span className={styles.accountColValue}>{formatCurrency(DEMO_BANK)}</span>
        </div>
      </Card>

      {/* Weekly Chart */}
      <Card padding="md" className={styles.weeklyCard}>
        <div className={styles.weeklyChart} ref={chartRef}>
          {DEMO_WEEKLY.map((item, idx) => {
            const maxAmount = Math.max(...DEMO_WEEKLY.map((w) => w.amount));
            const height = (item.amount / maxAmount) * 100;
            const isHighest = item.amount === maxAmount;
            return (
              <div key={idx} className={styles.weeklyColumn}>
                <div
                  className={cn(styles.weeklyBar, isHighest && styles.weeklyBarHighlight)}
                  style={{ height: `${height}%` }}
                />
                <span className={styles.weeklyLabel}>{item.day}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Transactions */}
      <div className={styles.transactionSection}>
        <div className={styles.sectionHeader}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>Transaksi Terakhir</h3>
        </div>
        <div className={styles.transactionList}>
          {DEMO_TRANSACTIONS.map((tx) => {
            const IconComp = tx.icon;
            return (
              <div key={tx.id} className={styles.transactionCard}>
                <div className={styles.txLeft}>
                  <div className={cn(styles.txIconWrapper, tx.type === 'income' ? styles.txIconIncome : styles.txIconExpense)}>
                    <IconComp size={20} />
                  </div>
                  <div className={styles.txInfo}>
                    <span className={styles.txCategoryTitle}>{tx.category}</span>
                    <span className={styles.txDateSmall}>{formatDateShort(tx.date)}</span>
                  </div>
                </div>
                <div className={styles.txRight}>
                  <span className={cn(styles.txAmountLarge, tx.type === 'income' ? styles.txIncome : styles.txExpense)}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Desktop Dashboard
// ============================================
const DesktopDashboard: React.FC<{
  cardsRef: React.RefObject<HTMLDivElement | null>;
  balanceRef: React.RefObject<HTMLElement | null>;
  currentMonth: string;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ cardsRef, balanceRef, currentMonth, navigate }) => {
  const cashflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cashflowRef.current) return;
    const bars = cashflowRef.current.querySelectorAll(`.${styles.cfBar}`);
    gsap.fromTo(
      bars,
      { scaleY: 0, transformOrigin: 'bottom' },
      { scaleY: 1, duration: 0.5, stagger: 0.03, ease: 'power2.out', delay: 0.4 },
    );
  }, []);

  return (
    <div className={styles.desktopDashboard} ref={cardsRef}>
      {/* Row 1: Balance + Category Spending */}
      <div className={styles.topRow}>
        {/* My Balance */}
        <Card padding="lg" className={styles.balanceCardDesktop} data-animate>
          <CardHeader
            title="Saldo Saya"
            action={
              <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.ADD_TRANSACTION)} icon={<Plus size={16} />}>
                Tambah Transaksi
              </Button>
            }
          />
          <div className={styles.desktopBalanceAmount}>
            <span className={styles.currencyPrefix}>Rp</span>
            <span ref={balanceRef as React.RefObject<HTMLSpanElement>}>0</span>
          </div>
          <div className={styles.desktopAccountPills}>
            <span className={styles.desktopPill}>💵 Tunai (Cash): {formatCurrency(DEMO_CASH)}</span>
            <span className={styles.desktopPill}>🏦 Bank: {formatCurrency(DEMO_BANK)}</span>
          </div>
          <p className={styles.desktopBalanceSub}>Saldo bulan {currentMonth}</p>

          <div className={styles.incomeExpenseRow}>
            <Card variant="default" padding="sm" className={styles.ieCard}>
              <div className={styles.ieIcon} style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <div className={styles.ieHeader}>
                  <span className={styles.ieLabel}>Pemasukan</span>
                  <span className={styles.ieChange} style={{ color: 'var(--color-success)' }}>
                    <TrendingUp size={12} /> 45.2%
                  </span>
                </div>
                <span className={styles.ieValue}>{formatCurrency(DEMO_INCOME)}</span>
              </div>
            </Card>
            <Card variant="default" padding="sm" className={styles.ieCard}>
              <div className={styles.ieIcon} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                <TrendingDown size={18} />
              </div>
              <div>
                <div className={styles.ieHeader}>
                  <span className={styles.ieLabel}>Pengeluaran</span>
                  <span className={styles.ieChange} style={{ color: 'var(--color-danger)' }}>
                    <TrendingDown size={12} /> 36.1%
                  </span>
                </div>
                <span className={styles.ieValue}>{formatCurrency(DEMO_EXPENSE)}</span>
              </div>
            </Card>
          </div>
        </Card>

        {/* Spending by Category */}
        <div className={styles.rightColumn} data-animate>
          <Card padding="lg" className={styles.categoryCard}>
            <CardHeader
              title="Pengeluaran per Kategori"
              action={
                <Button variant="ghost" size="sm">
                  Bulan Ini <ChevronDown size={14} />
                </Button>
              }
            />
            {/* Donut Chart Placeholder */}
            <div className={styles.donutContainer}>
              <svg viewBox="0 0 120 120" className={styles.donut}>
                {(() => {
                  let offset = 0;
                  const circumference = 2 * Math.PI * 45;
                  return DEMO_CATEGORIES_SPENDING.map((cat, idx) => {
                    const dash = (cat.percentage / 100) * circumference;
                    const el = (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={cat.color}
                        strokeWidth="14"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        className={styles.donutSegment}
                      />
                    );
                    offset += dash;
                    return el;
                  });
                })()}
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutPercentage}>80%</span>
                <span className={styles.donutLabel}>Total Pengeluaran</span>
              </div>
            </div>
            <div className={styles.categoryLegend}>
              {DEMO_CATEGORIES_SPENDING.map((cat) => (
                <div key={cat.name} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: cat.color }} />
                  <span className={styles.legendName}>{cat.name}</span>
                  <span className={styles.legendValue}>{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 2: Cash Flow Chart */}
      <Card padding="lg" data-animate>
        <CardHeader
          title="Arus Kas"
          action={
            <div className={styles.cfControls}>
              <div className={styles.cfLegendInline}>
                <span className={styles.cfLegDot} style={{ background: 'var(--color-primary)' }} /> Pemasukan
                <span className={styles.cfLegDot} style={{ background: 'var(--color-dark)' }} /> Pengeluaran
              </div>
              <Button variant="ghost" size="sm">
                Tahun Ini <ChevronDown size={14} />
              </Button>
              <Button variant="ghost" size="sm" icon={<MoreHorizontal size={16} />} />
            </div>
          }
        />
        <div className={styles.cashflowChart} ref={cashflowRef}>
          {DEMO_CASHFLOW.map((item, idx) => {
            const maxVal = Math.max(...DEMO_CASHFLOW.flatMap((d) => [d.income, d.expense]));
            const incomeH = (item.income / maxVal) * 100;
            const expenseH = (item.expense / maxVal) * 100;
            return (
              <div key={idx} className={styles.cfColumn}>
                <div className={styles.cfBars}>
                  <div
                    className={cn(styles.cfBar, styles.cfIncome)}
                    style={{ height: `${incomeH}%` }}
                  />
                  <div
                    className={cn(styles.cfBar, styles.cfExpense)}
                    style={{ height: `${expenseH}%` }}
                  />
                </div>
                <span className={styles.cfLabel}>{item.month}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Row 3: Recent Transactions + Savings */}
      <div className={styles.bottomRow}>
        {/* Recent Transactions */}
        <Card padding="lg" className={styles.recentTxCard} data-animate>
          <CardHeader
            title="Transaksi Terbaru"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.TRANSACTIONS)}>
                Lihat Semua <ArrowRight size={14} />
              </Button>
            }
          />
          <table className={styles.txTable}>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Jumlah</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TRANSACTIONS.map((tx) => {
                const IconComp = tx.icon;
                return (
                  <tr key={tx.id}>
                    <td>
                      <div className={styles.txMerchant}>
                        <span className={styles.txIcon}>
                          <IconComp size={16} />
                        </span>
                        <span>{tx.category}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.txCategoryBadge}>{tx.category}</span>
                    </td>
                    <td className={styles.txDateCol}>{formatDateShort(tx.date)}</td>
                    <td className={cn(tx.type === 'income' ? styles.txIncome : styles.txExpense)}>
                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(Math.abs(tx.amount))}
                    </td>
                    <td>
                      <span className={cn(styles.statusBadge, styles.statusComplete)}>Selesai</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Savings Plan */}
        <Card padding="lg" className={styles.savingsCard} data-animate>
          <CardHeader
            title="Rencana Tabungan"
            subtitle={formatCurrency(2400000000)}
            action={<Button variant="ghost" size="sm" icon={<MoreHorizontal size={16} />} />}
          />
          <div className={styles.savingsList}>
            {DEMO_SAVINGS.map((goal) => {
              const GoalIcon = goal.icon;
              return (
                <div key={goal.name} className={styles.savingsItem}>
                  <div className={styles.savingsIcon}>
                    <GoalIcon size={18} />
                  </div>
                  <div className={styles.savingsInfo}>
                    <span className={styles.savingsName}>{goal.name}</span>
                    <span className={styles.savingsProgress}>
                      {formatCurrency(goal.current)}/{formatCurrency(goal.target)}
                    </span>
                    <div className={styles.savingsBar}>
                      <div
                        className={styles.savingsBarFill}
                        style={{ width: `${goal.percentage}%`, background: goal.color }}
                      />
                    </div>
                  </div>
                  <span className={styles.savingsPercent} style={{ color: goal.color }}>
                    {goal.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
