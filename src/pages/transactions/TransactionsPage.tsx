// ============================================
// Fundly.id — Transactions Page with Interactive Filter & GSAP
// ============================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Plus,
  Utensils,
  Car,
  Briefcase,
  ShoppingCart,
  ArrowDownUp,
  Wallet,
  Building2,
  Calendar,
} from 'lucide-react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { ROUTES } from '../../config/routes';
import { formatCurrency } from '../../utils/formatCurrency';
import { getDateGroupLabel } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { ActionSearchBar, type ActionItem } from '../../components/ui/ActionSearchBar/ActionSearchBar';
import styles from './TransactionsPage.module.css';

const QUICK_SEARCH_ACTIONS: ActionItem[] = [
  {
    id: '1',
    label: 'Makanan & Minuman',
    icon: <Utensils size={14} style={{ color: 'var(--color-warning)' }} />,
    description: 'Filter pengeluaran makanan & resto',
    end: 'Kategori',
  },
  {
    id: '2',
    label: 'Transportasi & Tol',
    icon: <Car size={14} style={{ color: 'var(--color-info)' }} />,
    description: 'Filter bensin, ojol, & jalan tol',
    end: 'Kategori',
  },
  {
    id: '3',
    label: 'Tunai (Cash)',
    icon: <Wallet size={14} style={{ color: 'var(--color-success)' }} />,
    description: 'Filter transaksi dompet tunai',
    end: 'Akun',
  },
  {
    id: '4',
    label: 'Bank',
    icon: <Building2 size={14} style={{ color: '#A855F7' }} />,
    description: 'Filter transaksi rekening bank',
    end: 'Akun',
  },
];

interface TransactionItem {
  id: string;
  amount: number;
  category: string;
  subcategory: string;
  icon: React.ComponentType<{ size?: number }>;
  type: 'expense' | 'income';
  time: string;
  account: 'Cash' | 'Bank' | 'GoPay';
  date: string;
}

const RAW_TRANSACTIONS: TransactionItem[] = [
  {
    id: '1',
    amount: -5000000,
    category: 'Makanan',
    subcategory: 'Makan siang resto',
    icon: Utensils,
    type: 'expense',
    time: '12:30',
    account: 'Cash',
    date: new Date().toISOString().split('T')[0],
  },
  {
    id: '2',
    amount: -1500000,
    category: 'Transportasi',
    subcategory: 'Ojol',
    icon: Car,
    type: 'expense',
    time: '09:15',
    account: 'GoPay',
    date: new Date().toISOString().split('T')[0],
  },
  {
    id: '3',
    amount: 20000000,
    category: 'Freelance',
    subcategory: 'Project Client',
    icon: Briefcase,
    type: 'income',
    time: '18:00',
    account: 'Bank',
    date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
  },
  {
    id: '4',
    amount: -8500000,
    category: 'Makanan',
    subcategory: 'Belanja Dapur',
    icon: Utensils,
    type: 'expense',
    time: '14:20',
    account: 'Cash',
    date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
  },
  {
    id: '5',
    amount: -2500000,
    category: 'Belanja',
    subcategory: 'Baju & Sepatu',
    icon: ShoppingCart,
    type: 'expense',
    time: '10:45',
    account: 'Bank',
    date: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
  },
];

type FilterType = 'all' | 'expense' | 'income';
type FilterAccount = 'all' | 'Cash' | 'Bank';
type SortOrder = 'newest' | 'highest';
type DatePreset = 'all' | 'thisMonth' | 'last7' | 'custom';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const listRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterAccount, setFilterAccount] = useState<FilterAccount>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<TransactionItem | null>(null);

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    let result = [...RAW_TRANSACTIONS];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.category.toLowerCase().includes(q) ||
          tx.subcategory.toLowerCase().includes(q) ||
          tx.account.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter((tx) => tx.type === filterType);
    }

    // Account filter
    if (filterAccount !== 'all') {
      result = result.filter((tx) => (filterAccount === 'Cash' ? tx.account === 'Cash' : tx.account !== 'Cash'));
    }

    // Date range filter
    if (startDate) {
      result = result.filter((tx) => tx.date >= startDate);
    }
    if (endDate) {
      result = result.filter((tx) => tx.date <= endDate);
    }

    // Sort order
    if (sortOrder === 'highest') {
      result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    } else {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return result;
  }, [searchQuery, filterType, filterAccount, startDate, endDate, sortOrder]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    filteredTransactions.forEach((tx) => {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date)!.push(tx);
    });
    return Array.from(map.entries()).map(([date, transactions]) => ({ date, transactions }));
  }, [filteredTransactions]);

  // GSAP animation when filtered result changes
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll(`.${styles.txItem}`);
    gsap.fromTo(
      items,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
    );
  }, [groupedTransactions]);

  return (
    <div className={styles.page}>
      {/* Search & Filter Toolbar */}
      <div className={styles.toolbar}>
        <ActionSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          actions={QUICK_SEARCH_ACTIONS}
          placeholder="Cari transaksi, makanan, bank (⌘K)..."
        />

        <div className={styles.filterDropdownWrapper}>
          <Button
            variant={filterType !== 'all' || filterAccount !== 'all' || sortOrder !== 'newest' ? 'primary' : 'outline'}
            size="md"
            icon={<SlidersHorizontal size={16} />}
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          >
            Filter
          </Button>

          {/* Smooth Filter Dropdown / Modal (Framer Motion AnimatePresence) */}
          <AnimatePresence>
            {showFilterDrawer && (
              <motion.div
                className={styles.filterModalOverlay}
                onClick={() => setShowFilterDrawer(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className={styles.filterModalCard}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                >
                  <div className={styles.filterModalHeader}>
                    <h3>Filter & Urutkan Transaksi</h3>
                    <button className={styles.closeBtn} onClick={() => setShowFilterDrawer(false)}>
                      ×
                    </button>
                  </div>

                  {/* Filter Rentang Tanggal (Clean Presets + Custom Expandable) */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Rentang Tanggal</label>
                    <div className={styles.modalOptionGrid}>
                      <button
                        className={cn(styles.modalOptionBtn, datePreset === 'all' && styles.optionSelected)}
                        onClick={() => { setDatePreset('all'); setStartDate(''); setEndDate(''); }}
                      >
                        Semua Waktu
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, datePreset === 'thisMonth' && styles.optionSelected)}
                        onClick={() => {
                          setDatePreset('thisMonth');
                          const now = new Date();
                          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                          setStartDate(firstDay);
                          setEndDate(lastDay);
                        }}
                      >
                        Bulan Ini
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, datePreset === 'last7' && styles.optionSelected)}
                        onClick={() => {
                          setDatePreset('last7');
                          const now = new Date();
                          const past = new Date();
                          past.setDate(now.getDate() - 7);
                          setStartDate(past.toISOString().split('T')[0]);
                          setEndDate(now.toISOString().split('T')[0]);
                        }}
                      >
                        7 Hari Terakhir
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, datePreset === 'custom' && styles.optionSelected)}
                        onClick={() => setDatePreset('custom')}
                      >
                        <Calendar size={14} /> Pilih Tanggal
                      </button>
                    </div>

                    {/* Expandable Custom Date Range Picker */}
                    <AnimatePresence>
                      {datePreset === 'custom' && (
                        <motion.div
                          className={styles.customDateExpandable}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className={styles.dateRangeColumn}>
                            <div className={styles.dateInputBox}>
                              <span className={styles.dateLabelTag}>Dari Tanggal</span>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={styles.styledDateInput}
                              />
                            </div>
                            <div className={styles.dateInputBox}>
                              <span className={styles.dateLabelTag}>Sampai Tanggal</span>
                              <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={styles.styledDateInput}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Filter Tipe Transaksi */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Tipe Transaksi</label>
                    <div className={styles.modalOptionGrid}>
                      <button
                        className={cn(styles.modalOptionBtn, filterType === 'all' && styles.optionSelected)}
                        onClick={() => setFilterType('all')}
                      >
                        Semua
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, filterType === 'expense' && styles.optionSelected)}
                        onClick={() => setFilterType('expense')}
                      >
                        Pengeluaran
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, filterType === 'income' && styles.optionSelected)}
                        onClick={() => setFilterType('income')}
                      >
                        Pemasukan
                      </button>
                    </div>
                  </div>

                  {/* Filter Dompet */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Sumber Dompet / Akun</label>
                    <div className={styles.modalOptionGrid}>
                      <button
                        className={cn(styles.modalOptionBtn, filterAccount === 'all' && styles.optionSelected)}
                        onClick={() => setFilterAccount('all')}
                      >
                        Semua Akun
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, filterAccount === 'Cash' && styles.optionSelected)}
                        onClick={() => setFilterAccount('Cash')}
                      >
                        <Wallet size={14} /> Tunai (Cash)
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, filterAccount === 'Bank' && styles.optionSelected)}
                        onClick={() => setFilterAccount('Bank')}
                      >
                        <Building2 size={14} /> Bank
                      </button>
                    </div>
                  </div>

                  {/* Filter Urutan */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Urutkan Berdasarkan</label>
                    <div className={styles.modalOptionGrid}>
                      <button
                        className={cn(styles.modalOptionBtn, sortOrder === 'newest' && styles.optionSelected)}
                        onClick={() => setSortOrder('newest')}
                      >
                        <ArrowDownUp size={14} /> Tanggal Terbaru
                      </button>
                      <button
                        className={cn(styles.modalOptionBtn, sortOrder === 'highest' && styles.optionSelected)}
                        onClick={() => setSortOrder('highest')}
                      >
                        <ArrowDownUp size={14} /> Nominal Terbesar
                      </button>
                    </div>
                  </div>

                  <div className={styles.filterModalFooter}>
                    <button
                      className={styles.resetBtn}
                      onClick={() => {
                        setFilterType('all');
                        setFilterAccount('all');
                        setDatePreset('all');
                        setStartDate('');
                        setEndDate('');
                        setSortOrder('newest');
                      }}
                    >
                      Reset Filter
                    </button>
                    <Button variant="primary" size="md" onClick={() => setShowFilterDrawer(false)}>
                      Terapkan
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isDesktop && (
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => navigate(ROUTES.ADD_TRANSACTION)}
          >
            Tambah
          </Button>
        )}
      </div>

      {/* Transaction Groups List */}
      <div className={styles.groups} ref={listRef}>
        {groupedTransactions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Tidak ada transaksi yang cocok dengan filter kamu.</p>
          </div>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.date} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupDate}>{getDateGroupLabel(group.date)}</span>
                <span className={styles.groupTotal}>
                  {formatCurrency(group.transactions.reduce((sum, tx) => sum + tx.amount, 0))}
                </span>
              </div>
              <Card padding="none">
                {group.transactions.map((tx, idx) => {
                  const IconComp = tx.icon;
                  return (
                    <div
                      key={tx.id}
                      className={cn(
                        styles.txItem,
                        idx < group.transactions.length - 1 && styles.txItemBordered
                      )}
                      onClick={() => setSelectedTxDetail(tx)}
                    >
                      <div className={styles.txIconWrap}>
                        <IconComp size={18} />
                      </div>
                      <div className={styles.txInfo}>
                        <span className={styles.txName}>{tx.category}</span>
                        <span className={styles.txMeta}>
                          {tx.account} · {tx.time}
                          {tx.subcategory && ` · ${tx.subcategory}`}
                        </span>
                      </div>
                      <span
                        className={cn(
                          styles.txAmount,
                          tx.type === 'income' ? styles.txIncome : styles.txExpense
                        )}
                      >
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Transaction Detail Modal Popup */}
      <AnimatePresence>
        {selectedTxDetail && (
          <motion.div
            className={styles.filterModalOverlay}
            onClick={() => setSelectedTxDetail(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.filterModalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            >
              <div className={styles.filterModalHeader}>
                <h3>Detail Transaksi</h3>
                <button className={styles.closeBtn} onClick={() => setSelectedTxDetail(null)}>
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={styles.txIconWrap} style={{ width: '48px', height: '48px' }}>
                    {React.createElement(selectedTxDetail.icon, { size: 22 })}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                      {selectedTxDetail.category}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      {selectedTxDetail.date} · {selectedTxDetail.time}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--color-bg-input)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Nominal</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: selectedTxDetail.type === 'income' ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                    {selectedTxDetail.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(selectedTxDetail.amount))}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'var(--color-bg-input)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', display: 'block' }}>Metode Pembayaran</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{selectedTxDetail.account}</span>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--color-bg-input)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', display: 'block' }}>Tipe</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{selectedTxDetail.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
                  </div>
                </div>

                {selectedTxDetail.subcategory && (
                  <div style={{ padding: '12px', background: 'var(--color-bg-input)', borderRadius: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: '2px' }}>Catatan / Deskripsi Detail</span>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: '500' }}>{selectedTxDetail.subcategory}</span>
                  </div>
                )}
              </div>

              <div className={styles.filterModalFooter}>
                <Button variant="outline" size="md" fullWidth onClick={() => setSelectedTxDetail(null)}>
                  Tutup
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

