// ============================================
// Fundly.id - Dashboard Page
// ============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { TrendingUp, TrendingDown, ArrowRight, Plus, Wallet, Building2, Settings, Target } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { SelectDropdown } from '../../components/ui/SelectDropdown/SelectDropdown';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { DataError } from '../../components/ui/DataError/DataError';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useCountUp } from '../../hooks/useAnimations';
import { useAccountMap, useCategoryMap, useFinanceStatus, useLiveGoals } from '../../hooks/useFinance';
import { useFinanceStore } from '../../stores/financeStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateShort } from '../../utils/formatDate';
import {
  categoryBreakdown,
  computeTotals,
  formatPctChange,
  goalProjection,
  lastMonthsCashflow,
  monthRange,
  pctChange,
  totalBalance as sumBalance,
  yearCashflow,
  type CategoryBreakdownItem,
} from '../../utils/finance';
import { DynamicIcon, readableIconColor } from '../../utils/icons';
import { cn } from '../../utils/cn';
import { ROUTES, editTransactionPath } from '../../config/routes';
import { MONTHS } from '../../config/constants';
import { UserDropdown } from '../../components/layout/UserDropdown/UserDropdown';
import { NotificationBell } from '../../components/layout/NotificationBell/NotificationBell';
import type { Account, Category, Goal, Transaction } from '../../types/models';
import styles from './DashboardPage.module.css';

interface CashflowItem {
  month: string;
  income: number;
  expense: number;
}

interface DashboardData {
  isLoading: boolean;
  totalBalance: number;
  cashBalance: number;
  nonCashBalance: number;
  activeAccounts: Account[];
  income: number;
  expense: number;
  incomeChange: number | null;
  expenseChange: number | null;
  recentTransactions: Transaction[];
  goals: Goal[];
  categoriesById: Map<string, Category>;
  accountsById: Map<string, Account>;
}

export const DashboardPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const cardsRef = useRef<HTMLDivElement>(null);
  const { isLoading, isError, error, reload } = useFinanceStatus();

  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const goals = useLiveGoals();
  const categoriesById = useCategoryMap();
  const accountsById = useAccountMap();

  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];

  const data = useMemo<DashboardData>(() => {
    const activeAccounts = accounts.filter((a) => a.is_active);
    const cashBalance = activeAccounts.filter((a) => a.type === 'cash').reduce((s, a) => s + a.balance, 0);
    const total = sumBalance(accounts);
    const today = new Date();
    const thisMonth = computeTotals(transactions, monthRange(today.getFullYear(), today.getMonth()));
    const lastMonth = computeTotals(transactions, monthRange(today.getFullYear(), today.getMonth() - 1));
    return {
      isLoading,
      totalBalance: total,
      cashBalance,
      nonCashBalance: total - cashBalance,
      activeAccounts,
      income: thisMonth.income,
      expense: thisMonth.expense,
      incomeChange: pctChange(thisMonth.income, lastMonth.income),
      expenseChange: pctChange(thisMonth.expense, lastMonth.expense),
      recentTransactions: transactions.slice(0, 6),
      goals,
      categoriesById,
      accountsById,
    };
  }, [accounts, transactions, goals, categoriesById, accountsById, isLoading]);

  // Smooth count-up animation (nilai dalam Rupiah)
  const balanceRef = useCountUp(isLoading ? 0 : data.totalBalance, 0.8, 0, isMobile);

  if (isError) {
    return <DataError message={error} onRetry={() => void reload()} />;
  }

  if (isMobile) {
    return <MobileDashboard balanceRef={balanceRef} currentMonth={currentMonth} navigate={navigate} data={data} />;
  }

  return (
    <DesktopDashboard
      cardsRef={cardsRef}
      balanceRef={balanceRef}
      currentMonth={currentMonth}
      navigate={navigate}
      data={data}
    />
  );
};

// ============================================
// Shared helpers
// ============================================
function describeTx(tx: Transaction, data: DashboardData) {
  if (tx.type === 'transfer') {
    const from = data.accountsById.get(tx.account_id)?.name || 'Akun';
    const to = tx.to_account_id ? data.accountsById.get(tx.to_account_id)?.name || 'Akun' : 'Akun';
    return { name: tx.note || `Transfer ${from} → ${to}`, category: 'Transfer', icon: 'arrow-left-right', color: '#5AC8FA' };
  }
  const cat = tx.category_id ? data.categoriesById.get(tx.category_id) : undefined;
  return {
    name: tx.note || cat?.name || 'Tanpa Kategori',
    category: cat?.name || 'Tanpa Kategori',
    icon: cat?.icon || 'tag',
    color: cat?.color || '#AEAEB2',
  };
}

const amountSign = (tx: Transaction) => (tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '');

const CashflowBars: React.FC<{ data: CashflowItem[]; chartRef: React.RefObject<HTMLDivElement | null>; height?: string }> = ({
  data,
  chartRef,
  height,
}) => {
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  return (
    <div className={styles.cashflowChart} ref={chartRef} style={height ? { height, paddingTop: 'var(--space-2)' } : undefined}>
      {data.map((item, idx) => {
        const incomeH = item.income > 0 ? Math.max((item.income / maxVal) * 100, 4) : 0;
        const expenseH = item.expense > 0 ? Math.max((item.expense / maxVal) * 100, 4) : 0;
        return (
          <div key={`${item.month}-${idx}`} className={styles.cfColumn}>
            <div className={styles.cfBars}>
              <div className={styles.cfBarWrapper}>
                <div className={cn(styles.cfBar, styles.cfIncome)} style={{ height: `${incomeH}%` }} />
                <span className={styles.cfBarTooltip}>+{formatCurrency(item.income)}</span>
              </div>
              <div className={styles.cfBarWrapper}>
                <div className={cn(styles.cfBar, styles.cfExpense)} style={{ height: `${expenseH}%` }} />
                <span className={styles.cfBarTooltip}>-{formatCurrency(item.expense)}</span>
              </div>
            </div>
            <span className={styles.cfLabel}>{item.month}</span>
          </div>
        );
      })}
    </div>
  );
};

function useBarAnimation(chartRef: React.RefObject<HTMLDivElement | null>, key: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !chartRef.current) return;
    const bars = chartRef.current.querySelectorAll(`.${styles.cfBar}`);
    gsap.fromTo(bars, { scaleY: 0, transformOrigin: 'bottom' }, { scaleY: 1, duration: 0.4, stagger: 0.02, ease: 'power2.out' });
  }, [chartRef, key, enabled]);
}

// ============================================
// Mobile Dashboard
// ============================================
const MobileDashboard: React.FC<{
  balanceRef: React.RefObject<HTMLElement | null>;
  currentMonth: string;
  navigate: ReturnType<typeof useNavigate>;
  data: DashboardData;
}> = ({ balanceRef, currentMonth, navigate, data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const transactions = useFinanceStore((s) => s.transactions);
  const cashflowData = useMemo(() => lastMonthsCashflow(transactions, 6), [transactions]);

  useBarAnimation(chartRef, 'mobile', !data.isLoading);

  return (
    <div className={styles.mobileDashboard}>
      {/* Mobile Header */}
      <div className={styles.mobileHeader}>
        <div className={styles.userGreeting}>
          <UserDropdown mobileView />
        </div>
        <div className={styles.mobileHeaderActions}>
          <button className={styles.notifBtn} aria-label="Pengaturan" onClick={() => navigate(ROUTES.SETTINGS)}>
            <Settings size={20} />
          </button>
          <NotificationBell buttonClassName={styles.notifBtn} iconSize={22} />
        </div>
      </div>

      {/* Balance Card Mobile */}
      <Card variant="primary" padding="lg" className={styles.balanceCard}>
        <div className={styles.balanceHeader}>
          <span className={styles.balanceLabel}>Balance</span>
          <span className={styles.monthBadge}>{currentMonth}</span>
        </div>
        <div className={styles.balanceAmount}>
          <span className={styles.currencyPrefix}>Rp.</span>
          {data.isLoading ? (
            <Skeleton width="160px" height="34px" borderRadius="10px" style={{ opacity: 0.6 }} />
          ) : (
            <span className={styles.balanceValue} ref={balanceRef as React.RefObject<HTMLSpanElement>}>
              0
            </span>
          )}
        </div>

        <div className={styles.balanceDetails}>
          <div className={styles.balanceStatsGroup}>
            <div className={styles.balanceItem}>
              <span className={styles.balanceItemLabel}>Income</span>
              <span className={styles.balanceItemValue}>{formatCurrency(data.income)}</span>
            </div>
            <div className={styles.balanceItem}>
              <span className={styles.balanceItemLabel}>Expenses</span>
              <span className={styles.balanceItemValue}>{formatCurrency(data.expense)}</span>
            </div>
          </div>
          <Button variant="dark" size="sm" className={styles.addTransactionBtn} onClick={() => navigate(ROUTES.ADD_TRANSACTION)}>
            Add Transaction
          </Button>
        </div>
      </Card>

      {/* Card Tunai & Non-Tunai */}
      <Card
        padding="md"
        className={styles.accountsCardMobile}
        role="button"
        onClick={() => navigate(ROUTES.ACCOUNTS)}
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.accountColItem}>
          <div className={styles.accountColHeader}>
            <Wallet size={16} className={styles.accountIcon} />
            <span className={styles.accountColTitle}>Tunai (Cash)</span>
          </div>
          <span className={styles.accountColValue}>{data.isLoading ? '…' : formatCurrency(data.cashBalance)}</span>
        </div>

        <div className={styles.accountColDivider} />

        <div className={styles.accountColItem}>
          <div className={styles.accountColHeader}>
            <Building2 size={16} className={styles.accountIcon} />
            <span className={styles.accountColTitle}>Bank & E-Wallet</span>
          </div>
          <span className={styles.accountColValue}>{data.isLoading ? '…' : formatCurrency(data.nonCashBalance)}</span>
        </div>
      </Card>

      {/* Arus Kas Chart (Mobile) */}
      <Card padding="md" className={styles.weeklyCard}>
        <div className={styles.sectionHeader} style={{ marginBottom: 'var(--space-2)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)' }}>Arus Kas</h3>
          <div className={styles.cfLegendInline}>
            <span className={styles.cfLegDot} style={{ background: 'var(--color-primary)' }} /> Masuk
            <span className={styles.cfLegDot} style={{ background: 'var(--color-dark)', marginLeft: 8 }} /> Keluar
          </div>
        </div>
        <CashflowBars data={cashflowData} chartRef={chartRef} height="160px" />
      </Card>

      {/* Recent Transactions */}
      <div className={styles.transactionSection}>
        <div className={styles.sectionHeader}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>Transaksi Terakhir</h3>
          {data.recentTransactions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.TRANSACTIONS)}>
              Semua <ArrowRight size={14} />
            </Button>
          )}
        </div>
        <div className={styles.transactionList}>
          {data.isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px 0' }}>
              <Skeleton height="56px" borderRadius="14px" />
              <Skeleton height="56px" borderRadius="14px" />
              <Skeleton height="56px" borderRadius="14px" />
            </div>
          ) : data.recentTransactions.length === 0 ? (
            <div style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
              Belum ada transaksi. Tekan <strong>Add Transaction</strong> untuk mulai mencatat.
            </div>
          ) : (
            data.recentTransactions.map((tx) => {
              const info = describeTx(tx, data);
              return (
                <div
                  key={tx.id}
                  className={styles.transactionCard}
                  role="button"
                  onClick={() => navigate(editTransactionPath(tx.id))}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.txLeft}>
                    <div
                      className={cn(
                        styles.txIconWrapper,
                        tx.type === 'income' ? styles.txIconIncome : tx.type === 'transfer' ? styles.txIconTransfer : styles.txIconExpense,
                      )}
                    >
                      <DynamicIcon name={info.icon} size={20} />
                    </div>
                    <div className={styles.txInfo}>
                      <span className={styles.txCategoryTitle}>{info.name}</span>
                      <span className={styles.txDateSmall}>{formatDateShort(tx.transaction_date)}</span>
                    </div>
                  </div>
                  <div className={styles.txRight}>
                    <span
                      className={cn(styles.txAmountLarge, tx.type === 'income' ? styles.txIncome : styles.txExpense)}
                      style={tx.type === 'transfer' ? { color: 'var(--color-transfer)' } : undefined}
                    >
                      {amountSign(tx)}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
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
  data: DashboardData;
}> = ({ cardsRef, balanceRef, currentMonth, navigate, data }) => {
  const cashflowRef = useRef<HTMLDivElement>(null);
  const transactions = useFinanceStore((s) => s.transactions);
  const [categoryPeriod, setCategoryPeriod] = useState<'this' | 'last'>('this');
  const [cashflowPeriod, setCashflowPeriod] = useState<string>('last12');

  const now = new Date();

  const categories = useMemo<CategoryBreakdownItem[]>(() => {
    const offset = categoryPeriod === 'this' ? 0 : -1;
    return categoryBreakdown(
      transactions,
      data.categoriesById,
      'expense',
      monthRange(now.getFullYear(), now.getMonth() + offset),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, data.categoriesById, categoryPeriod]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear()]);
    transactions.forEach((t) => years.add(Number(t.transaction_date.slice(0, 4))));
    return [
      { value: 'last12', label: '12 Bulan Terakhir' },
      ...Array.from(years)
        .sort((a, b) => b - a)
        .map((y) => ({ value: String(y), label: `Tahun ${y}` })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const cashflowData = useMemo<CashflowItem[]>(
    () => (cashflowPeriod === 'last12' ? lastMonthsCashflow(transactions, 12) : yearCashflow(transactions, Number(cashflowPeriod))),
    [transactions, cashflowPeriod],
  );

  useBarAnimation(cashflowRef, cashflowPeriod, !data.isLoading);

  const topGoals = data.goals.slice(0, 4);
  const changeLabel = (change: number | null) => formatPctChange(change);

  return (
    <div className={styles.desktopDashboard} ref={cardsRef}>
      {/* Row 1: Balance + Category Spending */}
      <div className={styles.topRow}>
        <Card padding="lg" className={styles.balanceCardDesktop} data-animate>
          <CardHeader
            title="Total Uang Keseluruhan"
            action={
              <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.ADD_TRANSACTION)} icon={<Plus size={16} />}>
                Tambah Transaksi
              </Button>
            }
          />
          <div className={styles.desktopBalanceAmount}>
            <span className={styles.currencyPrefix}>Rp</span>
            {data.isLoading ? (
              <Skeleton width="220px" height="40px" borderRadius="12px" />
            ) : (
              <span ref={balanceRef as React.RefObject<HTMLSpanElement>}>0</span>
            )}
          </div>
          <div className={styles.desktopAccountPills}>
            {data.activeAccounts.slice(0, 4).map((acc) => (
              <button
                key={acc.id}
                type="button"
                className={styles.desktopPill}
                onClick={() => navigate(ROUTES.ACCOUNTS)}
                title={`${acc.name}: ${formatCurrency(acc.balance)}`}
              >
                <DynamicIcon name={acc.icon} size={14} className={styles.accountPillIcon} /> {acc.name} ·{' '}
                {formatCurrency(acc.balance, { compact: true })}
              </button>
            ))}
            {data.activeAccounts.length > 4 && (
              <button type="button" className={styles.desktopPill} onClick={() => navigate(ROUTES.ACCOUNTS)}>
                +{data.activeAccounts.length - 4} akun lainnya
              </button>
            )}
          </div>
          <p className={styles.desktopBalanceSub}>Arus kas bulan {currentMonth}</p>

          <div className={styles.incomeExpenseRow}>
            <Card variant="default" padding="sm" className={styles.ieCard}>
              <div className={styles.ieIcon} style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <div className={styles.ieHeader}>
                  <span className={styles.ieLabel}>Pemasukan</span>
                  <span
                    className={styles.ieChange}
                    style={{ color: (data.incomeChange ?? 1) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                    title="Dibanding bulan lalu"
                  >
                    {(data.incomeChange ?? 1) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{' '}
                    {changeLabel(data.incomeChange)}
                  </span>
                </div>
                <span className={styles.ieValue}>{formatCurrency(data.income)}</span>
              </div>
            </Card>
            <Card variant="default" padding="sm" className={styles.ieCard}>
              <div className={styles.ieIcon} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                <TrendingDown size={18} />
              </div>
              <div>
                <div className={styles.ieHeader}>
                  <span className={styles.ieLabel}>Pengeluaran</span>
                  <span
                    className={styles.ieChange}
                    style={{ color: (data.expenseChange ?? 1) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}
                    title="Dibanding bulan lalu"
                  >
                    {(data.expenseChange ?? 1) > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{' '}
                    {changeLabel(data.expenseChange)}
                  </span>
                </div>
                <span className={styles.ieValue}>{formatCurrency(data.expense)}</span>
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
                <SelectDropdown
                  value={categoryPeriod}
                  onChange={(v) => setCategoryPeriod(v as 'this' | 'last')}
                  options={[
                    { value: 'this', label: 'Bulan Ini' },
                    { value: 'last', label: 'Bulan Lalu' },
                  ]}
                />
              }
            />
            {data.isLoading ? (
              <Skeleton height="220px" borderRadius="16px" />
            ) : categories.length === 0 ? (
              <div style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
                Belum ada pengeluaran di {categoryPeriod === 'this' ? 'bulan ini' : 'bulan lalu'}.
              </div>
            ) : (
              <>
                <div className={styles.donutContainer}>
                  <svg viewBox="0 0 120 120" className={styles.donut}>
                    {(() => {
                      let offset = 0;
                      const circumference = 2 * Math.PI * 45;
                      return categories.map((cat) => {
                        const dash = (cat.amount / Math.max(1, categories.reduce((s, c) => s + c.amount, 0))) * circumference;
                        const el = (
                          <circle
                            key={cat.id}
                            cx="60"
                            cy="60"
                            r="45"
                            fill="none"
                            stroke={cat.color || '#C6E83B'}
                            strokeWidth="14"
                            strokeDasharray={`${dash} ${circumference - dash}`}
                            strokeDashoffset={-offset}
                            className={styles.donutSegment}
                          >
                            <title>
                              {cat.name}: {formatCurrency(cat.amount)}
                            </title>
                          </circle>
                        );
                        offset += dash;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className={styles.donutCenter}>
                    <span className={styles.donutPercentage}>
                      {formatCurrency(categories.reduce((s, c) => s + c.amount, 0), { compact: true })}
                    </span>
                    <span className={styles.donutLabel}>Total Pengeluaran</span>
                  </div>
                </div>
                <div className={styles.categoryLegend}>
                  {categories.slice(0, 6).map((cat) => (
                    <div key={cat.id} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: cat.color || '#C6E83B' }} />
                      <span className={styles.legendName}>{cat.name}</span>
                      <span className={styles.legendValue}>{cat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
              <SelectDropdown value={cashflowPeriod} onChange={setCashflowPeriod} options={yearOptions} />
            </div>
          }
        />
        {data.isLoading ? <Skeleton height="220px" borderRadius="16px" /> : <CashflowBars data={cashflowData} chartRef={cashflowRef} />}
      </Card>

      {/* Row 3: Recent Transactions + Savings */}
      <div className={styles.bottomRow}>
        <Card padding="lg" className={styles.recentTxCard} data-animate>
          <CardHeader
            title="Transaksi Terbaru"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.TRANSACTIONS)}>
                Lihat Semua <ArrowRight size={14} />
              </Button>
            }
          />
          {data.isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
              <Skeleton height="42px" borderRadius="10px" />
              <Skeleton height="42px" borderRadius="10px" />
              <Skeleton height="42px" borderRadius="10px" />
            </div>
          ) : data.recentTransactions.length === 0 ? (
            <div style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
              Belum ada transaksi. Tekan tombol <strong>+ Tambah Transaksi</strong> di atas untuk membuat transaksi pertama!
            </div>
          ) : (
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
                {data.recentTransactions.map((tx) => {
                  const info = describeTx(tx, data);
                  return (
                    <tr key={tx.id} onClick={() => navigate(editTransactionPath(tx.id))} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className={styles.txMerchant}>
                          <span className={styles.txIcon} style={{ color: readableIconColor(info.color) }}>
                            <DynamicIcon name={info.icon} size={16} />
                          </span>
                          <span>{info.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.txCategoryBadge}>{info.category}</span>
                      </td>
                      <td className={styles.txDateCol}>{formatDateShort(tx.transaction_date)}</td>
                      <td
                        className={cn(tx.type === 'income' ? styles.txIncome : styles.txExpense)}
                        style={tx.type === 'transfer' ? { color: 'var(--color-transfer)' } : undefined}
                      >
                        {amountSign(tx)} {formatCurrency(tx.amount)}
                      </td>
                      <td>
                        <span className={cn(styles.statusBadge, tx.status === 'cleared' ? styles.statusComplete : styles.statusPending)}>
                          {tx.status === 'cleared' ? 'Selesai' : 'Tertunda'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Savings Plan */}
        <Card padding="lg" className={styles.savingsCard} data-animate>
          <CardHeader
            title="Rencana Tabungan"
            subtitle={`Target ${formatCurrency(data.goals.reduce((acc, g) => acc + g.target_amount, 0))}`}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.GOALS)}>
                Kelola <ArrowRight size={14} />
              </Button>
            }
          />
          {data.isLoading ? (
            <Skeleton height="160px" borderRadius="14px" />
          ) : topGoals.length === 0 ? (
            <div style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
              Belum ada target tabungan.{' '}
              <button
                type="button"
                onClick={() => navigate(ROUTES.GOALS)}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer' }}
              >
                Buat target pertama
              </button>
            </div>
          ) : (
            <div className={styles.savingsList}>
              {topGoals.map((goal) => {
                const proj = goalProjection(goal);
                const gColor = goal.color || '#C6E83B';
                return (
                  <div key={goal.id} className={styles.savingsItem} onClick={() => navigate(ROUTES.GOALS)} style={{ cursor: 'pointer' }}>
                    <div className={styles.savingsIcon}>
                      <DynamicIcon name={goal.icon} size={18} fallback={Target} />
                    </div>
                    <div className={styles.savingsInfo}>
                      <span className={styles.savingsName}>{goal.name}</span>
                      <span className={styles.savingsProgress}>
                        {formatCurrency(goal.current_amount)}/{formatCurrency(goal.target_amount)}
                      </span>
                      <div className={styles.savingsBar}>
                        <div className={styles.savingsBarFill} style={{ width: `${proj.percentage}%`, background: gColor }} />
                      </div>
                    </div>
                    <span className={styles.savingsPercent} style={{ color: readableIconColor(gColor) }}>
                      {proj.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
