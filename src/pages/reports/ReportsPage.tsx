// ============================================
// Fundly.id — Glitch-Free Reports Page with GSAP Animated Numbers
// Fix Horizontal Layout Shift on "Anggaran & Target" Tab Click
// GSAP Count-Up Active Across All Tabs
// ============================================

import React, { useState, useRef } from 'react';
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
  Utensils,
  ShoppingCart,
  Car,
  Receipt,
  ShieldCheck,
  Target,
  PiggyBank,
  Briefcase,
  DollarSign,
  Award,
} from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber/AnimatedNumber';
import { SelectDropdown } from '../../components/ui/SelectDropdown/SelectDropdown';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from './ReportsPage.module.css';

const REPORT_TABS = [
  { id: 'overview', label: 'Ringkasan' },
  { id: 'income', label: 'Pemasukan' },
  { id: 'expense', label: 'Pengeluaran' },
  { id: 'savings', label: 'Tabungan' },
  { id: 'budget', label: 'Anggaran' },
  { id: 'goals', label: 'Target Finansial' },
];

const PERIOD_OPTIONS = [
  { value: 'this-week', label: 'Minggu Ini' },
  { value: 'this-month', label: 'Bulan Ini (Okt 2026)' },
  { value: '01-2026', label: 'Januari 2026' },
  { value: '02-2026', label: 'Februari 2026' },
  { value: '03-2026', label: 'Maret 2026' },
  { value: '04-2026', label: 'April 2026' },
  { value: '05-2026', label: 'Mei 2026' },
  { value: '06-2026', label: 'Juni 2026' },
  { value: '07-2026', label: 'Juli 2026' },
  { value: '08-2026', label: 'Agustus 2026' },
  { value: '09-2026', label: 'September 2026' },
  { value: '10-2026', label: 'Oktober 2026' },
  { value: '11-2026', label: 'November 2026' },
  { value: '12-2026', label: 'Desember 2026' },
  { value: 'this-year', label: 'Tahun Ini (2026)' },
];

const GRANULARITY_OPTIONS = [
  { value: 'harian', label: 'Harian' },
  { value: 'mingguan', label: 'Mingguan' },
  { value: 'bulanan', label: 'Bulanan' },
];

// ---- Overview Cashflow Chart Data ----
const DAILY_CASHFLOW_DATA = [
  { day: '10 Oct', income: 24000000, expense: 12000000, savings: 12000000 },
  { day: '11 Oct', income: 26000000, expense: 14000000, savings: 12000000 },
  { day: '12 Oct', income: 38000000, expense: 19000000, savings: 19000000 },
  { day: '13 Oct', income: 42000000, expense: 21000000, savings: 21000000 },
  { day: '14 Oct', income: 39000000, expense: 18000000, savings: 21000000 },
  { day: '15 Oct', income: 45000000, expense: 22000000, savings: 23000000 },
  { day: '16 Oct', income: 41000000, expense: 17000000, savings: 24000000 },
  { day: '17 Oct', income: 52000000, expense: 25000000, savings: 27000000 },
  { day: '18 Oct', income: 48000000, expense: 20000000, savings: 28000000 },
  { day: '19 Oct', income: 55000000, expense: 26000000, savings: 29000000 },
  { day: '20 Oct', income: 58000000, expense: 27000000, savings: 31000000 },
];

// ---- Income Sources Breakdown ----
const INCOME_SOURCES = [
  { name: 'Gaji Bulanan & Bonus', tag: 'Pekerjaan Utama', amount: 18000000, pct: 72, color: '#C6E83B', icon: Briefcase },
  { name: 'Freelance & Projects', tag: 'Sampingan', amount: 5000000, pct: 20, color: '#1C1C1E', icon: DollarSign },
  { name: 'Investasi & Dividen', tag: 'Pasif', amount: 2000000, pct: 8, color: '#6E6E73', icon: TrendingUp },
];

// ---- Expense Breakdown ----
const EXPENSE_CATEGORIES = [
  { name: 'Makanan & Kuliner', tag: 'Kebutuhan Utama', amount: 4550000, pct: 35, color: '#C6E83B', icon: Utensils },
  { name: 'Belanja Bulanan', tag: 'Groceries', amount: 3250000, pct: 25, color: '#1C1C1E', icon: ShoppingCart },
  { name: 'Transportasi & Bensin', tag: 'Operasional', amount: 2600000, pct: 20, color: '#6E6E73', icon: Car },
  { name: 'Tagihan & Subskripsi', tag: 'Rutin', amount: 1560000, pct: 12, color: '#C6E83B', icon: Receipt },
  { name: 'Hiburan & Gaya Hidup', tag: 'Sekunder', amount: 1040000, pct: 8, color: '#1C1C1E', icon: Layers },
];

// ---- Savings Allocations ----
const SAVINGS_ALLOCATIONS = [
  { name: 'Dana Darurat (6x Gaji)', amount: 45000000, target: 60000000, pct: 75, color: '#C6E83B', icon: PiggyBank },
  { name: 'Investasi Saham & Reeksadana', amount: 25000000, target: 40000000, pct: 62, color: '#1C1C1E', icon: TrendingUp },
  { name: 'Tabungan DP Rumah', amount: 35000000, target: 100000000, pct: 35, color: '#6E6E73', icon: Target },
];

// ---- Donut Pie Data ----
const PIE_DATA = [
  { name: 'Kebutuhan Utama', value: 50, color: '#C6E83B' },
  { name: 'Tabungan & Asset', value: 25, color: '#1C1C1E' },
  { name: 'Investasi', value: 15, color: '#6E6E73' },
  { name: 'Gaya Hidup', value: 10, color: '#AEAEB2' },
];

// ---- Budgets Data ----
const DEMO_BUDGETS = [
  { id: '1', category: 'Makanan & Kuliner', spent: 4550000, limit: 6000000, icon: Utensils },
  { id: '2', category: 'Belanja Bulanan', spent: 3250000, limit: 4000000, icon: ShoppingCart },
  { id: '3', category: 'Transportasi & Bensin', spent: 2600000, limit: 2500000, icon: Car },
  { id: '4', category: 'Langganan & Tagihan', spent: 1560000, limit: 2000000, icon: Receipt },
];

// ---- Financial Goals Data ----
const DEMO_GOALS = [
  { id: '1', name: 'Dana Darurat 6 Bulan', current: 45000000, target: 60000000, date: 'Desember 2026', icon: ShieldCheck },
  { id: '2', name: 'Beli Mobil Impian', current: 65000000, target: 100000000, date: 'Juni 2027', icon: Car },
  { id: '3', name: 'Liburan Jepang 2027', current: 16000000, target: 20000000, date: 'Maret 2027', icon: Award },
];

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [periodVal, setPeriodVal] = useState('this-month');
  const [granularityVal, setGranularityVal] = useState('harian');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const totalIncome = 25000000;
  const totalExpense = 13000000;
  const netSavings = totalIncome - totalExpense;

  const handleTabClick = (tabId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(tabId);
    // ONLY scroll internal tabsBar container horizontally (Never scroll body/window to the right!)
    const container = tabsContainerRef.current;
    const target = e.currentTarget;
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.left - containerRect.left - (containerRect.width / 2) + (targetRect.width / 2);
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleExport = () => {
    alert('Laporan berhasil diekspor!');
  };

  const mobileTabOptions = REPORT_TABS.map((t) => ({ value: t.id, label: t.label }));

  return (
    <div className={styles.page}>
      {/* Top Header Controls */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Laporan Keuangan</h1>
          <p className={styles.pageSubtitle}>Analisis arus kas & alokasi anggaran bulanan</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.periodDropdown}>
            <SelectDropdown
              options={PERIOD_OPTIONS}
              value={periodVal}
              onChange={setPeriodVal}
              icon={<Calendar size={15} />}
              fullWidth
            />
          </div>

          <SelectDropdown
            options={GRANULARITY_OPTIONS}
            value={granularityVal}
            onChange={setGranularityVal}
          />

          <Button variant="primary" size="md" icon={<Download size={16} />} onClick={handleExport}>
            Ekspor
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      {isMobile ? (
        <div className={styles.mobileTabWrapper}>
          <SelectDropdown
            options={mobileTabOptions}
            value={activeTab}
            onChange={setActiveTab}
            prefixLabel="Laporan"
            fullWidth
          />
        </div>
      ) : (
        <div className={styles.tabsBar} ref={tabsContainerRef}>
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={(e) => handleTabClick(tab.id, e)}
                className={cn(styles.tabBtn, isActive && styles.tabBtnActive)}
              >
                {tab.label}
                {isActive && <div className={styles.tabIndicator} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: RINGKASAN (OVERVIEW) */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Stat Cards Grid with GSAP Animated Numbers */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Total Pemasukan</span>
                <div className={styles.kpiIconIncome}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`inc-${activeTab}`} value={totalIncome} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>+26%</span>
              </div>
              <span className={styles.kpiSubtext}>+Rp 3,2JT vs bln lalu</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Total Pengeluaran</span>
                <div className={styles.kpiIconExpense}>
                  <TrendingDown size={16} />
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`exp-${activeTab}`} value={totalExpense} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeRed)}>-15%</span>
              </div>
              <span className={styles.kpiSubtext}>-Rp 1,1JT vs bln lalu</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Pendapatan Bersih</span>
                <div className={styles.kpiIconSavings}>
                  <Wallet size={16} />
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`net-${activeTab}`} value={netSavings} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>+18%</span>
              </div>
              <span className={styles.kpiSubtext}>Surplus bulan ini</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Rasio Hemat</span>
                <div className={styles.kpiIconHealth}>
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`rate-${activeTab}`} value={48} isCurrency={false} suffix="%" className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>Aman</span>
              </div>
              <span className={styles.kpiSubtext}>Target min. 30%</span>
            </div>
          </div>

          {/* Main Cashflow Area Chart Card */}
          <Card padding="lg" className={styles.cashflowCard}>
            <div className={styles.chartCardHeader}>
              <div>
                <h3 className={styles.chartTitle}>Arus Kas Harian</h3>
                <p className={styles.chartSub}>Pemasukan vs Pengeluaran</p>
              </div>

              <div className={styles.chartHeaderRight}>
                <div className={styles.chartTotalBadge}>
                  <AnimatedNumber key={`tot-${activeTab}`} value={totalIncome} className={styles.badgeAmount} />
                  <span className={cn(styles.badge, styles.badgeGreen)}>+15% ↗</span>
                </div>
              </div>
            </div>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                <AreaChart data={DAILY_CASHFLOW_DATA} margin={{ top: 15, right: 10, left: isMobile ? -25 : -20, bottom: 0 }}>
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
                  <XAxis dataKey="day" stroke="#A0A0AB" fontSize={isMobile ? 10 : 12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A0A0AB" fontSize={isMobile ? 10 : 11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Pemasukan"
                    stroke="#C6E83B"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#incomeGradLime)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Pengeluaran"
                    stroke="#1C1C1E"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#expenseGradBlack)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Split Grid: Category Breakdown + Donut Chart */}
          <div className={styles.splitGrid}>
            {/* Top Category Breakdown */}
            <Card padding="lg">
              <CardHeader
                title="Kategori Pengeluaran Terbesar"
                subtitle="Rincian pengeluaran per sektor"
                icon={<Layers size={18} />}
              />
              <div className={styles.categoryList}>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const IconComp = cat.icon;
                  return (
                    <div key={cat.name} className={styles.catRow}>
                      <div className={styles.catIconBox} style={{ background: `${cat.color}18` }}>
                        <IconComp size={18} style={{ color: cat.color === '#1C1C1E' ? 'var(--color-text-primary)' : cat.color }} />
                      </div>
                      <div className={styles.catMeta}>
                        <span className={styles.catTitle}>{cat.name}</span>
                        <span className={styles.catSub}>{cat.tag}</span>
                      </div>
                      <div className={styles.catAmountBlock}>
                        <AnimatedNumber key={`cat-${cat.name}-${activeTab}`} value={cat.amount} className={styles.catVal} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Donut Chart Alokasi */}
            <Card padding="lg">
              <div className={styles.pocketHeader}>
                <h3 className={styles.pocketTitle}>Alokasi Kantong (My Pocket)</h3>
                <button className={styles.seeDetailLink}>Lihat Detail</button>
              </div>

              <div className={styles.donutContainer}>
                <ResponsiveContainer width="100%" height={210}>
                  <RePieChart>
                    <Pie
                      data={PIE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={86}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {PIE_DATA.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="none"
                          strokeWidth={0}
                          style={{ outline: 'none' }}
                        />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <span className={styles.centerVal}>100%</span>
                </div>
              </div>

              <div className={styles.pocketLegendList}>
                {PIE_DATA.map((item) => (
                  <div key={item.name} className={styles.legendRow}>
                    <div className={styles.legendLeft}>
                      <span className={styles.dot} style={{ background: item.color }} />
                      <span className={styles.legendName}>{item.name}</span>
                    </div>
                    <span className={styles.legendPct}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PEMASUKAN (INCOME) */}
      {/* ============================================================ */}
      {activeTab === 'income' && (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Total Pemasukan</span>
                <div className={styles.kpiIconIncome}><TrendingUp size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`inc-tab-${activeTab}`} value={totalIncome} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>+15.4%</span>
              </div>
              <span className={styles.kpiSubtext}>Akumulasi bulan ini</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Pemasukan Utama</span>
                <div className={styles.kpiIconIncome}><Briefcase size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`main-inc-${activeTab}`} value={18000000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>72%</span>
              </div>
              <span className={styles.kpiSubtext}>Gaji & Bonus Tetap</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Pemasukan Sampingan</span>
                <div className={styles.kpiIconSavings}><DollarSign size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`side-inc-${activeTab}`} value={7000000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>28%</span>
              </div>
              <span className={styles.kpiSubtext}>Freelance & Dividen</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Rata-Rata Harian</span>
                <div className={styles.kpiIconHealth}><Calendar size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`avg-inc-${activeTab}`} value={833000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>/ hari</span>
              </div>
              <span className={styles.kpiSubtext}>Estimasi pendapatan</span>
            </div>
          </div>

          <Card padding="lg">
            <CardHeader title="Grafik Tren Pemasukan" subtitle="Pertumbuhan aliran pendapatan" icon={<TrendingUp size={18} />} />
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                <AreaChart data={DAILY_CASHFLOW_DATA} margin={{ top: 15, right: 10, left: isMobile ? -25 : -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGradPure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C6E83B" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#C6E83B" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                  <XAxis dataKey="day" stroke="#A0A0AB" fontSize={isMobile ? 10 : 12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A0A0AB" fontSize={isMobile ? 10 : 11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#C6E83B" strokeWidth={3} fillOpacity={1} fill="url(#incomeGradPure)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Rincian Sumber Pemasukan" subtitle="Breakdown kategori pendapatan" icon={<Briefcase size={18} />} />
            <div className={styles.categoryList}>
              {INCOME_SOURCES.map((source) => {
                const IconComp = source.icon;
                return (
                  <div key={source.name} className={styles.catRow}>
                    <div className={styles.catIconBox} style={{ background: `${source.color}18` }}>
                      <IconComp size={18} style={{ color: source.color === '#1C1C1E' ? 'var(--color-text-primary)' : source.color }} />
                    </div>
                    <div className={styles.catMeta}>
                      <span className={styles.catTitle}>{source.name}</span>
                      <span className={styles.catSub}>{source.tag}</span>
                    </div>
                    <div className={styles.catAmountBlock}>
                      <AnimatedNumber key={`src-${source.name}-${activeTab}`} value={source.amount} className={styles.catVal} />
                      <span className={cn(styles.badge, styles.badgeGreen)}>{source.pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PENGELUARAN (EXPENSE) */}
      {/* ============================================================ */}
      {activeTab === 'expense' && (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Total Pengeluaran</span>
                <div className={styles.kpiIconExpense}><TrendingDown size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`exp-tab-${activeTab}`} value={totalExpense} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeRed)}>-15%</span>
              </div>
              <span className={styles.kpiSubtext}>Akumulasi bulan ini</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Pengeluaran Wajib</span>
                <div className={styles.kpiIconExpense}><Receipt size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`need-exp-${activeTab}`} value={8550000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeRed)}>65%</span>
              </div>
              <span className={styles.kpiSubtext}>Tagihan & Groceries</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Pengeluaran Opsional</span>
                <div className={styles.kpiIconSavings}><Layers size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`opt-exp-${activeTab}`} value={4450000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>35%</span>
              </div>
              <span className={styles.kpiSubtext}>Kuliner & Gaya Hidup</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Rata-Rata Harian</span>
                <div className={styles.kpiIconHealth}><Calendar size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`avg-exp-${activeTab}`} value={433000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeRed)}>/ hari</span>
              </div>
              <span className={styles.kpiSubtext}>Rata-rata harian</span>
            </div>
          </div>

          <Card padding="lg">
            <CardHeader title="Grafik Tren Pengeluaran Harian" subtitle="Visualisasi pemakaian dana harian" icon={<TrendingDown size={18} />} />
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                <AreaChart data={DAILY_CASHFLOW_DATA} margin={{ top: 15, right: 10, left: isMobile ? -25 : -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseGradPure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1C1C1E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1C1C1E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                  <XAxis dataKey="day" stroke="#A0A0AB" fontSize={isMobile ? 10 : 12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A0A0AB" fontSize={isMobile ? 10 : 11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#1C1C1E" strokeWidth={3} fillOpacity={1} fill="url(#expenseGradPure)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Kategori Pengeluaran Terbesar" subtitle="Alokasi biaya berdasarkan sektor" icon={<Layers size={18} />} />
            <div className={styles.categoryList}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                return (
                  <div key={cat.name} className={styles.catRow}>
                    <div className={styles.catIconBox} style={{ background: `${cat.color}18` }}>
                      <IconComp size={18} style={{ color: cat.color === '#1C1C1E' ? 'var(--color-text-primary)' : cat.color }} />
                    </div>
                    <div className={styles.catMeta}>
                      <span className={styles.catTitle}>{cat.name}</span>
                      <span className={styles.catSub}>{cat.tag}</span>
                    </div>
                    <div className={styles.catAmountBlock}>
                      <AnimatedNumber key={`exp-cat-${cat.name}-${activeTab}`} value={cat.amount} className={styles.catVal} />
                      <span className={cn(styles.badge, styles.badgeRed)}>{cat.pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/* TAB 4: TABUNGAN (SAVINGS) */}
      {/* ============================================================ */}
      {activeTab === 'savings' && (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Total Surplus Tabungan</span>
                <div className={styles.kpiIconIncome}><PiggyBank size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`sav-tab-${activeTab}`} value={netSavings} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>+18%</span>
              </div>
              <span className={styles.kpiSubtext}>Surplus bulan ini</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Rasio Hemat</span>
                <div className={styles.kpiIconHealth}><ShieldCheck size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`sav-rate-${activeTab}`} value={48} isCurrency={false} suffix="%" className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>Aman</span>
              </div>
              <span className={styles.kpiSubtext}>Target min. 30%</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Akumulasi Dana Darurat</span>
                <div className={styles.kpiIconSavings}><Wallet size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`emerg-${activeTab}`} value={45000000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>75%</span>
              </div>
              <span className={styles.kpiSubtext}>Target Rp 60JT (6x Gaji)</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTopRow}>
                <span className={styles.kpiLabel}>Total Portofolio Aset</span>
                <div className={styles.kpiIconIncome}><Target size={16} /></div>
              </div>
              <div className={styles.kpiValueRow}>
                <AnimatedNumber key={`asset-${activeTab}`} value={105000000} className={styles.kpiVal} />
                <span className={cn(styles.badge, styles.badgeGreen)}>+24%</span>
              </div>
              <span className={styles.kpiSubtext}>Tabungan + Investasi</span>
            </div>
          </div>

          <Card padding="lg">
            <CardHeader title="Pertumbuhan Tabungan Bulanan" subtitle="Grafik perkembangan surplus tabungan" icon={<PiggyBank size={18} />} />
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                <AreaChart data={DAILY_CASHFLOW_DATA} margin={{ top: 15, right: 10, left: isMobile ? -25 : -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="savingsGradPure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C6E83B" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#C6E83B" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" />
                  <XAxis dataKey="day" stroke="#A0A0AB" fontSize={isMobile ? 10 : 12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A0A0AB" fontSize={isMobile ? 10 : 11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="savings" name="Tabungan" stroke="#C6E83B" strokeWidth={3} fillOpacity={1} fill="url(#savingsGradPure)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Alokasi Pos Tabungan & Aset" subtitle="Progres pemenuhan target tabungan" icon={<Target size={18} />} />
            <div className={styles.categoryList}>
              {SAVINGS_ALLOCATIONS.map((item) => {
                const IconComp = item.icon;
                return (
                  <div key={item.name} className={styles.catRow}>
                    <div className={styles.catIconBox} style={{ background: `${item.color}18` }}>
                      <IconComp size={18} style={{ color: item.color === '#1C1C1E' ? 'var(--color-text-primary)' : item.color }} />
                    </div>
                    <div className={styles.catMeta}>
                      <span className={styles.catTitle}>{item.name}</span>
                      <span className={styles.catSub}>Terkumpul {formatCurrency(item.amount)} dari {formatCurrency(item.target)}</span>
                    </div>
                    <div className={styles.catAmountBlock}>
                      <span className={styles.catVal}>{item.pct}%</span>
                      <span className={cn(styles.badge, styles.badgeGreen)}>On Track</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/* TAB 5: ANGGARAN (BUDGET) */}
      {/* ============================================================ */}
      {activeTab === 'budget' && (
        <Card padding="lg">
          <CardHeader title="Status Anggaran Bulanan (Budget)" subtitle="Batas pengeluaran per kategori bulan ini" icon={<Wallet size={18} />} />
          <div className={styles.budgetGrid}>
            {DEMO_BUDGETS.map((item) => {
              const pct = Math.round((item.spent / item.limit) * 100);
              const isOver = pct > 100;
              const isWarning = pct >= 80 && pct <= 100;
              const IconComp = item.icon;
              const barColor = isOver ? 'var(--color-danger)' : isWarning ? 'var(--color-warning)' : 'var(--color-primary)';

              return (
                <div key={item.id} className={styles.budgetCard}>
                  <div className={styles.budgetTop}>
                    <div className={styles.budgetTitleGroup}>
                      <div className={styles.budgetIconCircle}>
                        <IconComp size={16} />
                      </div>
                      <span className={styles.budgetName} title={item.category}>{item.category}</span>
                    </div>
                    <span className={cn(styles.statusPill, isOver ? styles.statusOver : isWarning ? styles.statusWarning : styles.statusSafe)}>
                      {isOver ? 'Kelebihan' : isWarning ? 'Waspada' : 'Aman'}
                    </span>
                  </div>

                  <div className={styles.budgetAmounts}>
                    <AnimatedNumber key={`bdg-${item.id}-${activeTab}`} value={item.spent} className={styles.spentVal} />
                    <span className={styles.limitVal}>dari {formatCurrency(item.limit)}</span>
                  </div>

                  <div className={styles.budgetTrack}>
                    <div className={styles.budgetFill} style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* TAB 6: TARGET FINANSIAL (GOALS) */}
      {/* ============================================================ */}
      {activeTab === 'goals' && (
        <Card padding="lg">
          <CardHeader title="Target Tabungan & Finansial (Goals)" subtitle="Progres pencapaian impian Anda" icon={<Target size={18} />} />
          <div className={styles.categoryList}>
            {DEMO_GOALS.map((goal) => {
              const IconComp = goal.icon;
              const pct = Math.round((goal.current / goal.target) * 100);
              return (
                <div key={goal.id} className={styles.catRow}>
                  <div className={styles.catIconBox} style={{ background: 'var(--color-primary-subtle)' }}>
                    <IconComp size={18} style={{ color: 'var(--color-dark)' }} />
                  </div>
                  <div className={styles.catMeta}>
                    <span className={styles.catTitle}>{goal.name}</span>
                    <span className={styles.catSub}>Target s/d {goal.date} ({formatCurrency(goal.current)} / {formatCurrency(goal.target)})</span>
                  </div>
                  <div className={styles.catAmountBlock}>
                    <AnimatedNumber key={`goal-${goal.id}-${activeTab}`} value={pct} isCurrency={false} suffix="%" className={styles.catVal} />
                    <span className={cn(styles.badge, styles.badgeGreen)}>{pct >= 100 ? 'Tercapai' : 'Berjalan'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

// ---- Custom Tooltip ----
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipTitle}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: entry.color }} />
            <span className={styles.tooltipName}>{entry.name}:</span>
            <span className={styles.tooltipVal}>{formatCurrency(entry.value)}</span>
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
