// ============================================
// Fundly.id - Reports Page (data real-time dari Supabase)
// ============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Layers,
  ShieldCheck,
  Target,
  PiggyBank,
  Briefcase,
  Receipt,
  FileText,
  FileSpreadsheet,
  Sheet,
  BarChart3,
} from 'lucide-react';
import { endOfMonth, endOfWeek, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { Card, CardHeader } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber/AnimatedNumber';
import { SelectDropdown } from '../../components/ui/SelectDropdown/SelectDropdown';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { DataError } from '../../components/ui/DataError/DataError';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAccountMap, useCategoryMap, useFinanceStatus, useLiveGoals } from '../../hooks/useFinance';
import { useFinanceStore } from '../../stores/financeStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCompact, formatCurrency } from '../../utils/formatCurrency';
import { MONTHS_SHORT, formatDate, formatMonthYear, toISODate } from '../../utils/formatDate';
import {
  budgetHealth,
  buildSeries,
  categoryBreakdown,
  computeTotals,
  daysInRange,
  elapsedDaysInRange,
  filterByRange,
  formatDeadline,
  formatPctChange,
  goalProjection,
  pctChange,
  previousRange,
  spentForBudget,
  totalBalance,
  type CategoryBreakdownItem,
  type DateRangeISO,
  type Granularity,
} from '../../utils/finance';
import { exportReport, type ExportFormat } from '../../utils/exportReport';
import { DynamicIcon, readableIconColor } from '../../utils/icons';
import { ROUTES } from '../../config/routes';
import styles from './ReportsPage.module.css';

const REPORT_TABS = [
  { id: 'overview', label: 'Ringkasan' },
  { id: 'income', label: 'Pemasukan' },
  { id: 'expense', label: 'Pengeluaran' },
  { id: 'savings', label: 'Tabungan' },
  { id: 'budget', label: 'Anggaran' },
  { id: 'goals', label: 'Target Finansial' },
];

const GRANULARITY_OPTIONS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
];

const PIE_COLORS = ['#C6E83B', '#1C1C1E', '#6E6E73', '#AEAEB2', '#E5E5EA'];

function resolvePeriod(value: string, today = new Date()): { range: DateRangeISO; label: string } {
  switch (value) {
    case 'this-week':
      return {
        range: { start: toISODate(startOfWeek(today, { weekStartsOn: 1 })), end: toISODate(endOfWeek(today, { weekStartsOn: 1 })) },
        label: 'Minggu Ini',
      };
    case 'this-month':
      return { range: { start: toISODate(startOfMonth(today)), end: toISODate(endOfMonth(today)) }, label: 'Bulan Ini' };
    case 'last-3m':
      return { range: { start: toISODate(startOfMonth(subMonths(today, 2))), end: toISODate(endOfMonth(today)) }, label: '3 Bulan Terakhir' };
    case 'last-6m':
      return { range: { start: toISODate(startOfMonth(subMonths(today, 5))), end: toISODate(endOfMonth(today)) }, label: '6 Bulan Terakhir' };
    case 'last-12m':
      return { range: { start: toISODate(startOfMonth(subMonths(today, 11))), end: toISODate(endOfMonth(today)) }, label: '12 Bulan Terakhir' };
    case 'this-year':
      return { range: { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31` }, label: `Tahun ${today.getFullYear()}` };
    case 'last-year': {
      const y = today.getFullYear() - 1;
      return { range: { start: `${y}-01-01`, end: `${y}-12-31` }, label: `Tahun ${y}` };
    }
    default: {
      // Format "YYYY-MM"
      const [y, m] = value.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return { range: { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) }, label: formatMonthYear(y, m - 1) };
    }
  }
}

function suggestGranularity(range: DateRangeISO): Granularity {
  const days = daysInRange(range);
  if (days <= 31) return 'daily';
  if (days <= 120) return 'weekly';
  return 'monthly';
}

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isLoading, isError, error, reload } = useFinanceStatus();
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const budgets = useFinanceStore((s) => s.budgets);
  const goals = useLiveGoals();
  const profile = useAuthStore((s) => s.profile);
  const categoriesById = useCategoryMap();
  const accountsById = useAccountMap();

  const [activeTab, setActiveTab] = useState('overview');
  const [periodVal, setPeriodVal] = useState('this-month');
  const [granularityVal, setGranularityVal] = useState<Granularity>('daily');
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const today = new Date();

  const periodOptions = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), i + 1);
      return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: formatMonthYear(d.getFullYear(), d.getMonth()) };
    });
    const now = new Date();
    return [
      { value: 'this-week', label: 'Minggu Ini' },
      { value: 'this-month', label: `Bulan Ini (${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()})` },
      ...months,
      { value: 'last-3m', label: '3 Bulan Terakhir' },
      { value: 'last-6m', label: '6 Bulan Terakhir' },
      { value: 'last-12m', label: '12 Bulan Terakhir' },
      { value: 'this-year', label: `Tahun Ini (${now.getFullYear()})` },
      { value: 'last-year', label: `Tahun Lalu (${now.getFullYear() - 1})` },
    ];
  }, []);

  const { range, label: periodLabel } = useMemo(() => resolvePeriod(periodVal), [periodVal]);
  const prevRange = useMemo(() => previousRange(range), [range]);

  // Sesuaikan granularitas otomatis saat periode berubah
  useEffect(() => setGranularityVal(suggestGranularity(range)), [range]);

  // ---- Derived report data ----
  const report = useMemo(() => {
    const totals = computeTotals(transactions, range);
    const prev = computeTotals(transactions, prevRange);
    const series = buildSeries(transactions, range, granularityVal);
    let running = 0;
    const cumulative = series.map((p) => {
      running += p.savings;
      return { ...p, cumulative: running };
    });
    const expenseBreakdown = categoryBreakdown(transactions, categoriesById, 'expense', range);
    const incomeBreakdown = categoryBreakdown(transactions, categoriesById, 'income', range);
    const prevExpenseMap = new Map(categoryBreakdown(transactions, categoriesById, 'expense', prevRange).map((c) => [c.id, c.amount]));
    const prevIncomeMap = new Map(categoryBreakdown(transactions, categoriesById, 'income', prevRange).map((c) => [c.id, c.amount]));
    const inRange = filterByRange(transactions, range);
    const elapsed = Math.max(1, elapsedDaysInRange(range));
    const largestExpense = inRange
      .filter((t) => t.type === 'expense' && t.status === 'cleared')
      .reduce<typeof inRange[number] | null>((max, t) => (!max || t.amount > max.amount ? t : max), null);
    const savingsRate = totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : 0;
    const prevSavingsRate = prev.income > 0 ? Math.round((prev.net / prev.income) * 100) : 0;

    return {
      totals,
      prev,
      series: cumulative,
      expenseBreakdown,
      incomeBreakdown,
      prevExpenseMap,
      prevIncomeMap,
      inRange,
      elapsed,
      largestExpense,
      savingsRate,
      prevSavingsRate,
      incomeChange: pctChange(totals.income, prev.income),
      expenseChange: pctChange(totals.expense, prev.expense),
      netChange: pctChange(totals.net, prev.net),
    };
  }, [transactions, range, prevRange, granularityVal, categoriesById]);

  const pieData = useMemo(() => {
    const items = report.expenseBreakdown;
    const top = items.slice(0, 4).map((c, i) => ({ name: c.name, value: c.percentage, amount: c.amount, color: PIE_COLORS[i] }));
    if (items.length > 4) {
      const rest = items.slice(4);
      top.push({
        name: 'Lainnya',
        value: rest.reduce((s, c) => s + c.percentage, 0),
        amount: rest.reduce((s, c) => s + c.amount, 0),
        color: PIE_COLORS[4],
      });
    }
    return top;
  }, [report.expenseBreakdown]);

  // Anggaran: jika periode adalah satu bulan, pakai bulan itu; selain itu bulan berjalan
  const budgetPeriod = useMemo(() => {
    const start = parseISO(range.start);
    const isSingleMonth = range.start.slice(0, 7) === range.end.slice(0, 7);
    const ref = isSingleMonth ? start : today;
    return { month: ref.getMonth() + 1, year: ref.getFullYear() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const budgetRows = useMemo(
    () =>
      budgets
        .filter((b) => b.month === budgetPeriod.month && b.year === budgetPeriod.year)
        .map((b) => {
          const cat = categoriesById.get(b.category_id);
          const spent = spentForBudget(transactions, b);
          return { ...b, spent, name: cat?.name || 'Kategori dihapus', icon: cat?.icon || 'tag', health: budgetHealth(spent, b.amount_limit) };
        })
        .sort((a, b) => b.spent / b.amount_limit - a.spent / a.amount_limit),
    [budgets, budgetPeriod, categoriesById, transactions],
  );

  const netWorth = totalBalance(accounts);
  // Dana target = total saldo akun (satu kali, bukan dijumlahkan per target)
  const totalGoalsSaved = goals.length > 0 ? Math.max(0, netWorth) : 0;
  const totalGoalsTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  const handleTabClick = (tabId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(tabId);
    const container = tabsContainerRef.current;
    const target = e.currentTarget;
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.left - containerRect.left - containerRect.width / 2 + targetRect.width / 2;
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (report.inRange.length === 0) {
      toast.error('Tidak ada transaksi pada periode ini untuk diekspor.');
      return;
    }
    setExporting(format);
    try {
      await exportReport(format, {
        title: 'Laporan Keuangan',
        periodLabel,
        range,
        totals: report.totals,
        expenseBreakdown: report.expenseBreakdown,
        incomeBreakdown: report.incomeBreakdown,
        transactions: report.inRange,
        categoriesById,
        accountsById,
        ownerName: profile?.full_name || undefined,
      });
      toast.success(`Laporan ${format.toUpperCase()} berhasil diunduh`);
      setShowExport(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat file laporan. Silakan coba lagi.');
    } finally {
      setExporting(null);
    }
  };

  const drillDown = (categoryId: string, type: 'income' | 'expense') => {
    const params = new URLSearchParams({ type, from: range.start, to: range.end });
    params.set('category', categoryId);
    navigate(`${ROUTES.TRANSACTIONS}?${params.toString()}`);
  };

  const mobileTabOptions = REPORT_TABS.map((t) => ({ value: t.id, label: t.label }));
  const vsLabel = 'vs periode lalu';
  const diffText = (cur: number, prev: number) => {
    const diff = cur - prev;
    return `${diff >= 0 ? '+' : '-'}Rp ${formatCompact(Math.abs(diff))} ${vsLabel}`;
  };
  const changeBadge = (change: number | null, goodWhenUp: boolean) => {
    const isGood = change === null ? goodWhenUp : goodWhenUp ? change >= 0 : change <= 0;
    return <span className={cn(styles.badge, isGood ? styles.badgeGreen : styles.badgeRed)}>{formatPctChange(change)}</span>;
  };

  const chartMargin = { top: 15, right: 10, left: isMobile ? -15 : -5, bottom: 0 };
  const yTick = (v: number) => (v === 0 ? '0' : formatCompact(v));
  const hasData = report.inRange.length > 0;

  const renderCategoryList = (items: CategoryBreakdownItem[], type: 'income' | 'expense', prevMap: Map<string, number>) =>
    items.length === 0 ? (
      <div className={styles.emptyInline}>Belum ada {type === 'income' ? 'pemasukan' : 'pengeluaran'} pada periode ini.</div>
    ) : (
      <div className={styles.categoryList}>
        {items.map((cat) => {
          const change = pctChange(cat.amount, prevMap.get(cat.id) || 0);
          return (
            <button key={cat.id} type="button" className={cn(styles.catRow, styles.catRowButton)} onClick={() => drillDown(cat.id, type)}>
              <div className={styles.catIconBox} style={{ background: `${cat.color}18` }}>
                <DynamicIcon name={cat.icon} size={18} color={readableIconColor(cat.color)} />
              </div>
              <div className={styles.catMeta}>
                <span className={styles.catTitle}>{cat.name}</span>
                <span className={styles.catSub}>
                  {cat.count} transaksi · {formatPctChange(change)} {vsLabel}
                </span>
              </div>
              <div className={styles.catAmountBlock}>
                <AnimatedNumber value={cat.amount} className={styles.catVal} />
                <span className={cn(styles.badge, type === 'income' ? styles.badgeGreen : styles.badgeRed)}>{cat.percentage}%</span>
              </div>
            </button>
          );
        })}
      </div>
    );

  const renderAreaChart = (dataKey: 'income' | 'expense' | 'cumulative' | 'both', height: number) => (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={report.series} margin={chartMargin}>
          <defs>
            <linearGradient id="incomeGradLime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C6E83B" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#C6E83B" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="expenseGradBlack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1C1C1E" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#1C1C1E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
          <XAxis dataKey="label" stroke="#A0A0AB" fontSize={isMobile ? 10 : 12} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis stroke="#A0A0AB" fontSize={isMobile ? 10 : 11} tickLine={false} axisLine={false} tickFormatter={yTick} width={56} />
          <Tooltip content={<CustomTooltip />} />
          {(dataKey === 'income' || dataKey === 'both') && (
            <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#C6E83B" strokeWidth={3} fillOpacity={1} fill="url(#incomeGradLime)" isAnimationActive={false} />
          )}
          {(dataKey === 'expense' || dataKey === 'both') && (
            <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#1C1C1E" strokeWidth={3} fillOpacity={1} fill="url(#expenseGradBlack)" isAnimationActive={false} />
          )}
          {dataKey === 'cumulative' && (
            <Area type="monotone" dataKey="cumulative" name="Akumulasi Tabungan" stroke="#C6E83B" strokeWidth={3} fillOpacity={1} fill="url(#incomeGradLime)" isAnimationActive={false} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const kpi = (labelText: string, icon: React.ReactNode, iconClass: string, value: React.ReactNode, badge: React.ReactNode, sub: string) => (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTopRow}>
        <span className={styles.kpiLabel}>{labelText}</span>
        <div className={iconClass}>{icon}</div>
      </div>
      <div className={styles.kpiValueRow}>
        {value}
        {badge}
      </div>
      <span className={styles.kpiSubtext}>{sub}</span>
    </div>
  );

  if (isError) return <DataError message={error} onRetry={() => void reload()} />;

  return (
    <div className={styles.page}>
      {/* Top Header Controls */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Laporan Keuangan</h1>
          <p className={styles.pageSubtitle}>
            {formatDate(range.start, 'dd MMM yyyy')} – {formatDate(range.end, 'dd MMM yyyy')}
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.periodDropdown}>
            <SelectDropdown options={periodOptions} value={periodVal} onChange={setPeriodVal} icon={<Calendar size={15} />} fullWidth />
          </div>

          <SelectDropdown options={GRANULARITY_OPTIONS} value={granularityVal} onChange={(v) => setGranularityVal(v as Granularity)} />

          <Button variant="primary" size="md" icon={<Download size={16} />} onClick={() => setShowExport(true)}>
            Ekspor
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      {isMobile ? (
        <div className={styles.mobileTabWrapper}>
          <SelectDropdown options={mobileTabOptions} value={activeTab} onChange={setActiveTab} prefixLabel="Laporan" fullWidth />
        </div>
      ) : (
        <div className={styles.tabsBar} ref={tabsContainerRef}>
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={(e) => handleTabClick(tab.id, e)} className={cn(styles.tabBtn, isActive && styles.tabBtnActive)}>
                {tab.label}
                {isActive && <div className={styles.tabIndicator} />}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <>
          <div className={styles.kpiGrid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height="110px" borderRadius="20px" />
            ))}
          </div>
          <Skeleton height="320px" borderRadius="20px" />
        </>
      ) : (
        <>
          {/* TAB 1: RINGKASAN */}
          {activeTab === 'overview' && (
            <>
              <div className={styles.kpiGrid}>
                {kpi(
                  'Total Pemasukan',
                  <TrendingUp size={16} />,
                  styles.kpiIconIncome,
                  <AnimatedNumber value={report.totals.income} className={styles.kpiVal} />,
                  changeBadge(report.incomeChange, true),
                  diffText(report.totals.income, report.prev.income),
                )}
                {kpi(
                  'Total Pengeluaran',
                  <TrendingDown size={16} />,
                  styles.kpiIconExpense,
                  <AnimatedNumber value={report.totals.expense} className={styles.kpiVal} />,
                  changeBadge(report.expenseChange, false),
                  diffText(report.totals.expense, report.prev.expense),
                )}
                {kpi(
                  'Pendapatan Bersih',
                  <Wallet size={16} />,
                  styles.kpiIconSavings,
                  <AnimatedNumber value={report.totals.net} className={styles.kpiVal} />,
                  changeBadge(report.netChange, true),
                  report.totals.net >= 0 ? `Surplus ${periodLabel.toLowerCase()}` : `Defisit ${periodLabel.toLowerCase()}`,
                )}
                {kpi(
                  'Rasio Hemat',
                  <ShieldCheck size={16} />,
                  styles.kpiIconHealth,
                  <AnimatedNumber value={report.savingsRate} isCurrency={false} suffix="%" className={styles.kpiVal} />,
                  <span className={cn(styles.badge, report.savingsRate >= 20 ? styles.badgeGreen : styles.badgeRed)}>
                    {report.savingsRate >= 30 ? 'Sehat' : report.savingsRate >= 20 ? 'Cukup' : 'Waspada'}
                  </span>,
                  'Target ideal min. 20–30%',
                )}
              </div>

              <Card padding="lg" className={styles.cashflowCard}>
                <div className={styles.chartCardHeader}>
                  <div>
                    <h3 className={styles.chartTitle}>
                      Arus Kas {GRANULARITY_OPTIONS.find((g) => g.value === granularityVal)?.label}
                    </h3>
                    <p className={styles.chartSub}>Pemasukan vs Pengeluaran · {periodLabel}</p>
                  </div>
                  <div className={styles.chartHeaderRight}>
                    <div className={styles.chartTotalBadge}>
                      <AnimatedNumber value={report.totals.net} className={styles.badgeAmount} />
                      <span className={cn(styles.badge, report.totals.net >= 0 ? styles.badgeGreen : styles.badgeRed)}>
                        {report.totals.net >= 0 ? 'Surplus ↗' : 'Defisit ↘'}
                      </span>
                    </div>
                  </div>
                </div>
                {hasData ? (
                  renderAreaChart('both', isMobile ? 220 : 300)
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="Belum Ada Data"
                    description={`Tidak ada transaksi pada periode ${periodLabel.toLowerCase()}. Coba pilih periode lain.`}
                  />
                )}
              </Card>

              <div className={styles.splitGrid}>
                <Card padding="lg">
                  <CardHeader title="Kategori Pengeluaran Terbesar" subtitle="Klik kategori untuk melihat transaksinya" icon={<Layers size={18} />} />
                  {renderCategoryList(report.expenseBreakdown.slice(0, 6), 'expense', report.prevExpenseMap)}
                </Card>

                <Card padding="lg">
                  <div className={styles.pocketHeader}>
                    <h3 className={styles.pocketTitle}>Komposisi Pengeluaran</h3>
                    <button className={styles.seeDetailLink} onClick={() => navigate(ROUTES.BUDGET)}>
                      Atur Anggaran
                    </button>
                  </div>

                  {pieData.length === 0 ? (
                    <div className={styles.emptyInline}>Belum ada pengeluaran pada periode ini.</div>
                  ) : (
                    <>
                      <div className={styles.donutContainer}>
                        <ResponsiveContainer width="100%" height={210}>
                          <RePieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={86} paddingAngle={4} dataKey="value" isAnimationActive={false}>
                              {pieData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} stroke="none" strokeWidth={0} style={{ outline: 'none' }} />
                              ))}
                            </Pie>
                          </RePieChart>
                        </ResponsiveContainer>
                        <div className={styles.donutCenter}>
                          <span className={styles.centerVal}>{formatCurrency(report.totals.expense, { compact: true })}</span>
                        </div>
                      </div>

                      <div className={styles.pocketLegendList}>
                        {pieData.map((item) => (
                          <div key={item.name} className={styles.legendRow} title={formatCurrency(item.amount)}>
                            <div className={styles.legendLeft}>
                              <span className={styles.dot} style={{ background: item.color }} />
                              <span className={styles.legendName}>{item.name}</span>
                            </div>
                            <span className={styles.legendPct}>{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </>
          )}

          {/* TAB 2: PEMASUKAN */}
          {activeTab === 'income' && (
            <>
              <div className={styles.kpiGrid}>
                {kpi(
                  'Total Pemasukan',
                  <TrendingUp size={16} />,
                  styles.kpiIconIncome,
                  <AnimatedNumber value={report.totals.income} className={styles.kpiVal} />,
                  changeBadge(report.incomeChange, true),
                  diffText(report.totals.income, report.prev.income),
                )}
                {kpi(
                  'Sumber Utama',
                  <Briefcase size={16} />,
                  styles.kpiIconIncome,
                  <AnimatedNumber value={report.incomeBreakdown[0]?.amount || 0} className={styles.kpiVal} />,
                  <span className={cn(styles.badge, styles.badgeGreen)}>{report.incomeBreakdown[0]?.percentage || 0}%</span>,
                  report.incomeBreakdown[0]?.name || 'Belum ada pemasukan',
                )}
                {kpi(
                  'Jumlah Transaksi',
                  <Receipt size={16} />,
                  styles.kpiIconSavings,
                  <AnimatedNumber
                    value={report.incomeBreakdown.reduce((s, c) => s + c.count, 0)}
                    isCurrency={false}
                    className={styles.kpiVal}
                  />,
                  <span className={cn(styles.badge, styles.badgeGreen)}>{report.incomeBreakdown.length} sumber</span>,
                  'Transaksi pemasukan tercatat',
                )}
                {kpi(
                  'Rata-Rata Harian',
                  <Calendar size={16} />,
                  styles.kpiIconHealth,
                  <AnimatedNumber value={Math.round(report.totals.income / report.elapsed)} className={styles.kpiVal} />,
                  <span className={cn(styles.badge, styles.badgeGreen)}>/ hari</span>,
                  `Dari ${report.elapsed} hari berjalan`,
                )}
              </div>

              <Card padding="lg">
                <CardHeader title="Grafik Tren Pemasukan" subtitle={`Aliran pendapatan · ${periodLabel}`} icon={<TrendingUp size={18} />} />
                {renderAreaChart('income', isMobile ? 220 : 280)}
              </Card>

              <Card padding="lg">
                <CardHeader title="Rincian Sumber Pemasukan" subtitle="Klik kategori untuk melihat transaksinya" icon={<Briefcase size={18} />} />
                {renderCategoryList(report.incomeBreakdown, 'income', report.prevIncomeMap)}
              </Card>
            </>
          )}

          {/* TAB 3: PENGELUARAN */}
          {activeTab === 'expense' && (
            <>
              <div className={styles.kpiGrid}>
                {kpi(
                  'Total Pengeluaran',
                  <TrendingDown size={16} />,
                  styles.kpiIconExpense,
                  <AnimatedNumber value={report.totals.expense} className={styles.kpiVal} />,
                  changeBadge(report.expenseChange, false),
                  diffText(report.totals.expense, report.prev.expense),
                )}
                {kpi(
                  'Kategori Terbesar',
                  <Layers size={16} />,
                  styles.kpiIconExpense,
                  <AnimatedNumber value={report.expenseBreakdown[0]?.amount || 0} className={styles.kpiVal} />,
                  <span className={cn(styles.badge, styles.badgeRed)}>{report.expenseBreakdown[0]?.percentage || 0}%</span>,
                  report.expenseBreakdown[0]?.name || 'Belum ada pengeluaran',
                )}
                {kpi(
                  'Transaksi Terbesar',
                  <Receipt size={16} />,
                  styles.kpiIconSavings,
                  <AnimatedNumber value={report.largestExpense?.amount || 0} className={styles.kpiVal} />,
                  <span className={cn(styles.badge, styles.badgeRed)}>1x</span>,
                  report.largestExpense
                    ? `${report.largestExpense.note || categoriesById.get(report.largestExpense.category_id || '')?.name || 'Pengeluaran'} · ${formatDate(report.largestExpense.transaction_date, 'dd MMM')}`
                    : 'Belum ada pengeluaran',
                )}
                {kpi(
                  'Rata-Rata Harian',
                  <Calendar size={16} />,
                  styles.kpiIconHealth,
                  <AnimatedNumber value={Math.round(report.totals.expense / report.elapsed)} className={styles.kpiVal} />,
                  <span className={cn(styles.badge, styles.badgeRed)}>/ hari</span>,
                  `Dari ${report.elapsed} hari berjalan`,
                )}
              </div>

              <Card padding="lg">
                <CardHeader title="Grafik Tren Pengeluaran" subtitle={`Pemakaian dana · ${periodLabel}`} icon={<TrendingDown size={18} />} />
                {renderAreaChart('expense', isMobile ? 220 : 280)}
              </Card>

              <Card padding="lg">
                <CardHeader title="Kategori Pengeluaran" subtitle="Dibandingkan dengan periode sebelumnya" icon={<Layers size={18} />} />
                {renderCategoryList(report.expenseBreakdown, 'expense', report.prevExpenseMap)}
              </Card>
            </>
          )}

          {/* TAB 4: TABUNGAN */}
          {activeTab === 'savings' && (
            <>
              <div className={styles.kpiGrid}>
                {kpi(
                  'Surplus Periode Ini',
                  <PiggyBank size={16} />,
                  styles.kpiIconIncome,
                  <AnimatedNumber value={report.totals.net} className={styles.kpiVal} />,
                  changeBadge(report.netChange, true),
                  diffText(report.totals.net, report.prev.net),
                )}
                {kpi(
                  'Rasio Hemat',
                  <ShieldCheck size={16} />,
                  styles.kpiIconHealth,
                  <AnimatedNumber value={report.savingsRate} isCurrency={false} suffix="%" className={styles.kpiVal} />,
                  <span className={cn(styles.badge, report.savingsRate >= report.prevSavingsRate ? styles.badgeGreen : styles.badgeRed)}>
                    {report.savingsRate - report.prevSavingsRate >= 0 ? '+' : ''}
                    {report.savingsRate - report.prevSavingsRate} poin
                  </span>,
                  'Dibanding periode sebelumnya',
                )}
                {kpi(
                  'Dana Tersedia untuk Target',
                  <Target size={16} />,
                  styles.kpiIconSavings,
                  <AnimatedNumber value={totalGoalsSaved} className={styles.kpiVal} />,
                  <span className={cn(styles.badge, styles.badgeGreen)}>
                    {totalGoalsTarget > 0 ? Math.floor((totalGoalsSaved / totalGoalsTarget) * 100) : 0}%
                  </span>,
                  `Dari total target ${formatCurrency(totalGoalsTarget, { compact: true })}`,
                )}
                {kpi(
                  'Kekayaan Bersih',
                  <Wallet size={16} />,
                  styles.kpiIconIncome,
                  <AnimatedNumber value={netWorth} className={styles.kpiVal} />,
                  <span className={cn(styles.badge, netWorth >= 0 ? styles.badgeGreen : styles.badgeRed)}>
                    {accounts.filter((a) => a.is_active).length} akun
                  </span>,
                  'Total saldo seluruh akun aktif',
                )}
              </div>

              <Card padding="lg">
                <CardHeader title="Akumulasi Tabungan" subtitle={`Surplus kumulatif · ${periodLabel}`} icon={<PiggyBank size={18} />} />
                {renderAreaChart('cumulative', isMobile ? 220 : 280)}
              </Card>
            </>
          )}

          {/* TAB 5: ANGGARAN */}
          {activeTab === 'budget' && (
            <Card padding="lg">
              <CardHeader
                title="Status Anggaran Bulanan"
                subtitle={`Batas pengeluaran per kategori · ${formatMonthYear(budgetPeriod.year, budgetPeriod.month - 1)}`}
                icon={<Wallet size={18} />}
              />
              {budgetRows.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Belum Ada Anggaran"
                  description="Belum ada anggaran untuk bulan ini. Atur batas pengeluaran per kategori di menu Anggaran."
                  actionLabel="Atur Anggaran"
                  onAction={() => navigate(ROUTES.BUDGET)}
                />
              ) : (
                <div className={styles.budgetGrid}>
                  {budgetRows.map((item) => {
                    const pct = Math.round((item.spent / item.amount_limit) * 100);
                    const isOver = item.health === 'over';
                    const isWarning = item.health === 'warning';
                    const barColor = isOver ? 'var(--color-danger)' : isWarning ? 'var(--color-warning)' : 'var(--color-primary)';

                    return (
                      <div key={item.id} className={styles.budgetCard}>
                        <div className={styles.budgetTop}>
                          <div className={styles.budgetTitleGroup}>
                            <div className={styles.budgetIconCircle}>
                              <DynamicIcon name={item.icon} size={16} />
                            </div>
                            <span className={styles.budgetName} title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <span className={cn(styles.statusPill, isOver ? styles.statusOver : isWarning ? styles.statusWarning : styles.statusSafe)}>
                            {isOver ? 'Kelebihan' : isWarning ? 'Waspada' : 'Aman'}
                          </span>
                        </div>

                        <div className={styles.budgetAmounts}>
                          <AnimatedNumber value={item.spent} className={styles.spentVal} />
                          <span className={styles.limitVal}>
                            dari {formatCurrency(item.amount_limit)} · {pct}%
                          </span>
                        </div>

                        <div className={styles.budgetTrack}>
                          <div className={styles.budgetFill} style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* TAB 6: TARGET FINANSIAL */}
          {activeTab === 'goals' && (
            <Card padding="lg">
              <CardHeader title="Target Tabungan & Finansial" subtitle="Progres pencapaian impian Anda" icon={<Target size={18} />} />
              {goals.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Belum Ada Target"
                  description="Buat target tabungan untuk memantau progres impian finansial Anda."
                  actionLabel="Buat Target"
                  onAction={() => navigate(ROUTES.GOALS)}
                />
              ) : (
                <div className={styles.categoryList}>
                  {goals.map((goal) => {
                    const proj = goalProjection(goal);
                    return (
                      <button key={goal.id} type="button" className={cn(styles.catRow, styles.catRowButton)} onClick={() => navigate(ROUTES.GOALS)}>
                        <div className={styles.catIconBox} style={{ background: `${goal.color}22` }}>
                          <DynamicIcon name={goal.icon} size={18} color={readableIconColor(goal.color)} />
                        </div>
                        <div className={styles.catMeta}>
                          <span className={styles.catTitle}>{goal.name}</span>
                          <span className={styles.catSub}>
                            {formatDeadline(goal.deadline)} · {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                          </span>
                        </div>
                        <div className={styles.catAmountBlock}>
                          <AnimatedNumber value={proj.percentage} isCurrency={false} suffix="%" className={styles.catVal} />
                          <span className={cn(styles.badge, proj.overdue ? styles.badgeRed : styles.badgeGreen)}>
                            {proj.achieved ? 'Tercapai' : proj.overdue ? 'Terlambat' : 'Berjalan'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Export Modal */}
      <Modal isOpen={showExport} onClose={() => !exporting && setShowExport(false)} size="sm" title="Ekspor Laporan">
        <div className={styles.exportBody}>
          <p className={styles.exportDesc}>
            {periodLabel} · {report.inRange.length} transaksi ({formatDate(range.start, 'dd MMM yyyy')} – {formatDate(range.end, 'dd MMM yyyy')})
          </p>
          {(
            [
              ['pdf', 'PDF (Siap Cetak)', 'Ringkasan, rincian kategori & daftar transaksi', FileText],
              ['xlsx', 'Excel (.xlsx)', 'Sheet ringkasan & sheet transaksi untuk diolah', FileSpreadsheet],
              ['csv', 'CSV', 'Format universal untuk impor ke aplikasi lain', Sheet],
            ] as [ExportFormat, string, string, React.ElementType][]
          ).map(([fmt, title, desc, Icon]) => (
            <button key={fmt} className={styles.exportOption} onClick={() => void handleExport(fmt)} disabled={Boolean(exporting)}>
              <span className={styles.exportIcon}>
                <Icon size={20} />
              </span>
              <span className={styles.exportText}>
                <span className={styles.exportTitle}>{exporting === fmt ? 'Menyiapkan file...' : title}</span>
                <span className={styles.exportSub}>{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

// ---- Custom Tooltip ----
interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number;
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[]; label?: string }> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipTitle}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: entry.color }} />
            <span className={styles.tooltipName}>{entry.name}:</span>
            <span className={styles.tooltipVal}>{formatCurrency(Number(entry.value) || 0)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Helper cn
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
