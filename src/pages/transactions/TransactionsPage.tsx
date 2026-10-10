// ============================================
// Fundly.id - Transactions Page (riwayat, pencarian, filter, detail)
// ============================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  SlidersHorizontal,
  Plus,
  ArrowDownUp,
  ArrowLeftRight,
  Calendar,
  Pencil,
  Trash2,
  Repeat,
  Wallet,
} from 'lucide-react';
import { endOfMonth, startOfMonth, subDays } from 'date-fns';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { ROUTES, editTransactionPath } from '../../config/routes';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateLong, formatTime, getDateGroupLabel, toISODate } from '../../utils/formatDate';
import { DynamicIcon, readableIconColor } from '../../utils/icons';
import { cn } from '../../utils/cn';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useAccountMap, useCategoryMap, useFinanceStatus } from '../../hooks/useFinance';
import { useFinanceStore } from '../../stores/financeStore';
import { ActionSearchBar } from '../../components/ui/ActionSearchBar/ActionSearchBar';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { DataError } from '../../components/ui/DataError/DataError';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog';
import type { Transaction } from '../../types/models';
import styles from './TransactionsPage.module.css';

type FilterType = 'all' | 'expense' | 'income' | 'transfer';
type SortOrder = 'newest' | 'oldest' | 'highest';
type DatePreset = 'all' | 'thisMonth' | 'last7' | 'last30' | 'custom';

const PAGE_STEP = 60;

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const listRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { isLoading, isError, error, reload } = useFinanceStatus();
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const categoriesById = useCategoryMap();
  const accountsById = useAccountMap();

  // Filter awal dapat dikirim lewat query string (drill-down dari Laporan / Akun)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>((searchParams.get('type') as FilterType) || 'all');
  const [filterAccount, setFilterAccount] = useState<string>(searchParams.get('account') || 'all');
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get('category') || 'all');
  const [datePreset, setDatePreset] = useState<DatePreset>(
    searchParams.get('from') || searchParams.get('to') ? 'custom' : 'all',
  );
  const [startDate, setStartDate] = useState(searchParams.get('from') || '');
  const [endDate, setEndDate] = useState(searchParams.get('to') || '');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  // Bersihkan query string setelah dibaca agar URL tetap rapi
  useEffect(() => {
    if (searchParams.toString()) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selalu tampilkan versi terbaru dari transaksi yang sedang dibuka (realtime)
  useEffect(() => {
    if (!selectedTx) return;
    const fresh = transactions.find((t) => t.id === selectedTx.id);
    if (!fresh) setSelectedTx(null);
    else if (fresh !== selectedTx) setSelectedTx(fresh);
  }, [transactions, selectedTx]);

  const describe = (tx: Transaction) => {
    const account = accountsById.get(tx.account_id);
    if (tx.type === 'transfer') {
      const to = tx.to_account_id ? accountsById.get(tx.to_account_id) : undefined;
      return {
        title: 'Transfer',
        icon: 'arrow-left-right',
        color: '#5AC8FA',
        accountLabel: `${account?.name || 'Akun'} → ${to?.name || 'Akun dihapus'}`,
      };
    }
    const cat = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
    return {
      title: cat?.name || 'Tanpa Kategori',
      icon: cat?.icon || 'tag',
      color: cat?.color || '#AEAEB2',
      accountLabel: account?.name || 'Akun dihapus',
    };
  };

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    let result = transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterAccount !== 'all' && tx.account_id !== filterAccount && tx.to_account_id !== filterAccount) return false;
      if (filterCategory !== 'all') {
        if (filterCategory === '__none__' ? tx.category_id !== null || tx.type === 'transfer' : tx.category_id !== filterCategory) return false;
      }
      if (startDate && tx.transaction_date < startDate) return false;
      if (endDate && tx.transaction_date > endDate) return false;
      if (q) {
        const cat = tx.category_id ? categoriesById.get(tx.category_id)?.name : tx.type === 'transfer' ? 'transfer' : '';
        const acc = accountsById.get(tx.account_id)?.name;
        const toAcc = tx.to_account_id ? accountsById.get(tx.to_account_id)?.name : '';
        const haystack = `${tx.note || ''} ${cat || ''} ${acc || ''} ${toAcc || ''}`.toLowerCase();
        const amountMatch = qDigits.length >= 3 && String(tx.amount).includes(qDigits);
        if (!haystack.includes(q) && !amountMatch) return false;
      }
      return true;
    });

    if (sortOrder === 'highest') {
      result = result.slice().sort((a, b) => b.amount - a.amount);
    } else if (sortOrder === 'oldest') {
      result = result.slice().reverse();
    }
    return result;
  }, [transactions, searchQuery, filterType, filterAccount, filterCategory, startDate, endDate, sortOrder, categoriesById, accountsById]);

  useEffect(() => setVisibleCount(PAGE_STEP), [searchQuery, filterType, filterAccount, filterCategory, startDate, endDate, sortOrder]);

  // Group by date (hanya untuk urutan tanggal)
  const groupedTransactions = useMemo(() => {
    const visible = filteredTransactions.slice(0, visibleCount);
    if (sortOrder === 'highest') return [{ date: '', transactions: visible }];
    const map = new Map<string, Transaction[]>();
    visible.forEach((tx) => {
      if (!map.has(tx.transaction_date)) map.set(tx.transaction_date, []);
      map.get(tx.transaction_date)!.push(tx);
    });
    return Array.from(map.entries()).map(([date, txs]) => ({ date, transactions: txs }));
  }, [filteredTransactions, visibleCount, sortOrder]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.status !== 'cleared') return;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    });
    return { income, expense };
  }, [filteredTransactions]);

  const activeFilterCount =
    (filterType !== 'all' ? 1 : 0) +
    (filterAccount !== 'all' ? 1 : 0) +
    (filterCategory !== 'all' ? 1 : 0) +
    (startDate || endDate ? 1 : 0) +
    (sortOrder !== 'newest' ? 1 : 0);

  // GSAP animation when filter result changes (bukan saat realtime update kecil)
  const animKey = `${searchQuery}|${filterType}|${filterAccount}|${filterCategory}|${startDate}|${endDate}|${sortOrder}|${isLoading}`;
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll(`.${styles.txItem}`);
    if (items.length === 0) return;
    gsap.fromTo(items, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: 'power2.out', clearProps: 'all' });
  }, [animKey]);

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'thisMonth') {
      setStartDate(toISODate(startOfMonth(now)));
      setEndDate(toISODate(endOfMonth(now)));
    } else if (preset === 'last7') {
      setStartDate(toISODate(subDays(now, 6)));
      setEndDate(toISODate(now));
    } else if (preset === 'last30') {
      setStartDate(toISODate(subDays(now, 29)));
      setEndDate(toISODate(now));
    }
  };

  const resetFilters = () => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    applyPreset('all');
    setSortOrder('newest');
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(pendingDelete.id);
      toast.success('Transaksi berhasil dihapus');
      setPendingDelete(null);
      setSelectedTx(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus transaksi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const signedAmount = (tx: Transaction) =>
    tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0;

  const filterCategories = categories.filter((c) => filterType === 'all' || c.type === filterType);

  const renderTxRow = (tx: Transaction, idx: number, total: number) => {
    const info = describe(tx);
    return (
      <div
        key={tx.id}
        role="button"
        tabIndex={0}
        className={cn(styles.txItem, idx < total - 1 && styles.txItemBordered)}
        onClick={() => setSelectedTx(tx)}
        onKeyDown={(e) => e.key === 'Enter' && setSelectedTx(tx)}
      >
        <div className={styles.txIconWrap} style={{ background: `${info.color}1F`, color: readableIconColor(info.color) }}>
          <DynamicIcon name={info.icon} size={18} />
        </div>
        <div className={styles.txInfo}>
          <span className={styles.txName}>{tx.note || info.title}</span>
          <span className={styles.txMeta}>
            {tx.note ? `${info.title} · ` : ''}
            {info.accountLabel} · {sortOrder === 'highest' ? `${tx.transaction_date.split('-').reverse().join('/')} ` : ''}
            {formatTime(tx.transaction_time)}
            {tx.status === 'pending' && ' · Tertunda'}
          </span>
        </div>
        <span
          className={cn(
            styles.txAmount,
            tx.type === 'income' ? styles.txIncome : tx.type === 'transfer' ? styles.txTransfer : styles.txExpense,
          )}
        >
          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
          {formatCurrency(tx.amount)}
        </span>
      </div>
    );
  };

  const detail = selectedTx ? describe(selectedTx) : null;

  return (
    <div className={styles.page}>
      {/* Search & Filter Toolbar */}
      <div className={styles.toolbar}>
        <ActionSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari catatan, kategori, akun, nominal (⌘K)..."
        />

        <div className={styles.filterDropdownWrapper}>
          <Button
            variant={activeFilterCount > 0 ? 'primary' : 'outline'}
            size="md"
            icon={<SlidersHorizontal size={16} />}
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          >
            {isDesktop ? `Filter${activeFilterCount ? ` (${activeFilterCount})` : ''}` : activeFilterCount || undefined}
          </Button>

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
                  className={cn(styles.filterModalCard, styles.filterModalScroll)}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                >
                  <div className={styles.filterModalHeader}>
                    <h3>Filter & Urutkan Transaksi</h3>
                    <button className={styles.closeBtn} onClick={() => setShowFilterDrawer(false)} aria-label="Tutup">
                      ×
                    </button>
                  </div>

                  {/* Rentang Tanggal */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Rentang Tanggal</label>
                    <div className={styles.modalOptionGrid}>
                      {(
                        [
                          ['all', 'Semua Waktu'],
                          ['thisMonth', 'Bulan Ini'],
                          ['last7', '7 Hari'],
                          ['last30', '30 Hari'],
                        ] as [DatePreset, string][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          className={cn(styles.modalOptionBtn, datePreset === value && styles.optionSelected)}
                          onClick={() => applyPreset(value)}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        className={cn(styles.modalOptionBtn, datePreset === 'custom' && styles.optionSelected)}
                        onClick={() => setDatePreset('custom')}
                      >
                        <Calendar size={14} /> Pilih Tanggal
                      </button>
                    </div>

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
                                max={endDate || undefined}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={styles.styledDateInput}
                              />
                            </div>
                            <div className={styles.dateInputBox}>
                              <span className={styles.dateLabelTag}>Sampai Tanggal</span>
                              <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={styles.styledDateInput}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Tipe Transaksi */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Tipe Transaksi</label>
                    <div className={styles.modalOptionGrid}>
                      {(
                        [
                          ['all', 'Semua'],
                          ['expense', 'Pengeluaran'],
                          ['income', 'Pemasukan'],
                          ['transfer', 'Transfer'],
                        ] as [FilterType, string][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          className={cn(styles.modalOptionBtn, filterType === value && styles.optionSelected)}
                          onClick={() => {
                            setFilterType(value);
                            setFilterCategory('all');
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Akun */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Sumber Dompet / Akun</label>
                    <div className={styles.modalOptionGrid}>
                      <button
                        className={cn(styles.modalOptionBtn, filterAccount === 'all' && styles.optionSelected)}
                        onClick={() => setFilterAccount('all')}
                      >
                        Semua Akun
                      </button>
                      {accounts.map((acc) => (
                        <button
                          key={acc.id}
                          className={cn(styles.modalOptionBtn, filterAccount === acc.id && styles.optionSelected)}
                          onClick={() => setFilterAccount(acc.id)}
                        >
                          <DynamicIcon name={acc.icon} size={14} fallback={Wallet} /> {acc.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kategori */}
                  {filterType !== 'transfer' && (
                    <div className={styles.filterSection}>
                      <label className={styles.filterLabel}>Kategori</label>
                      <div className={styles.modalOptionGrid}>
                        <button
                          className={cn(styles.modalOptionBtn, filterCategory === 'all' && styles.optionSelected)}
                          onClick={() => setFilterCategory('all')}
                        >
                          Semua Kategori
                        </button>
                        {filterCategories.map((cat) => (
                          <button
                            key={cat.id}
                            className={cn(styles.modalOptionBtn, filterCategory === cat.id && styles.optionSelected)}
                            onClick={() => setFilterCategory(cat.id)}
                          >
                            <DynamicIcon name={cat.icon} size={14} color={cat.color} /> {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Urutan */}
                  <div className={styles.filterSection}>
                    <label className={styles.filterLabel}>Urutkan Berdasarkan</label>
                    <div className={styles.modalOptionGrid}>
                      {(
                        [
                          ['newest', 'Tanggal Terbaru'],
                          ['oldest', 'Tanggal Terlama'],
                          ['highest', 'Nominal Terbesar'],
                        ] as [SortOrder, string][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          className={cn(styles.modalOptionBtn, sortOrder === value && styles.optionSelected)}
                          onClick={() => setSortOrder(value)}
                        >
                          <ArrowDownUp size={14} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.filterModalFooter}>
                    <button className={styles.resetBtn} onClick={resetFilters}>
                      Reset Filter
                    </button>
                    <Button variant="primary" size="md" onClick={() => setShowFilterDrawer(false)}>
                      Terapkan ({filteredTransactions.length})
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isDesktop && (
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => navigate(ROUTES.ADD_TRANSACTION)}>
            Tambah
          </Button>
        )}
      </div>

      {/* Ringkasan hasil filter */}
      {!isLoading && !isError && transactions.length > 0 && (
        <div className={styles.summaryRow}>
          <span className={styles.summaryChip}>
            {filteredTransactions.length} transaksi
          </span>
          <span className={cn(styles.summaryChip, styles.summaryIncome)}>+{formatCurrency(summary.income)}</span>
          <span className={cn(styles.summaryChip, styles.summaryExpense)}>-{formatCurrency(summary.expense)}</span>
          {activeFilterCount > 0 && (
            <button className={styles.summaryReset} onClick={resetFilters}>
              Reset filter
            </button>
          )}
        </div>
      )}

      {/* Transaction Groups List */}
      <div className={styles.groups} ref={listRef}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px 0' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="64px" borderRadius="16px" />
            ))}
          </div>
        ) : isError ? (
          <DataError message={error} onRetry={() => void reload()} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowDownUp}
            title="Belum Ada Transaksi"
            description="Riwayat pencatatan transaksi Anda akan muncul di sini. Mulai catat pemasukan atau pengeluaran pertama Anda!"
            actionLabel="Tambah Transaksi"
            actionIcon={<Plus size={16} />}
            onAction={() => navigate(ROUTES.ADD_TRANSACTION)}
          />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="Tidak Ada Hasil"
            description="Tidak ada transaksi yang cocok dengan pencarian atau filter Anda."
            actionLabel="Reset Filter"
            onAction={() => {
              resetFilters();
              setSearchQuery('');
            }}
          />
        ) : (
          <>
            {groupedTransactions.map((group) => {
              const net = group.transactions.reduce((sum, tx) => sum + (tx.status === 'cleared' ? signedAmount(tx) : 0), 0);
              return (
                <div key={group.date || 'sorted'} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <span className={styles.groupDate}>{group.date ? getDateGroupLabel(group.date) : 'Nominal Terbesar'}</span>
                    {group.date && (
                      <span className={styles.groupTotal}>
                        {net > 0 ? '+' : ''}
                        {formatCurrency(net)}
                      </span>
                    )}
                  </div>
                  <Card padding="none">
                    {group.transactions.map((tx, idx) => renderTxRow(tx, idx, group.transactions.length))}
                  </Card>
                </div>
              );
            })}
            {visibleCount < filteredTransactions.length && (
              <Button variant="outline" size="md" fullWidth onClick={() => setVisibleCount((c) => c + PAGE_STEP)}>
                Muat lebih banyak ({filteredTransactions.length - visibleCount} lagi)
              </Button>
            )}
          </>
        )}
      </div>

      {/* Transaction Detail Modal Popup */}
      <AnimatePresence>
        {selectedTx && detail && (
          <motion.div
            className={styles.filterModalOverlay}
            onClick={() => setSelectedTx(null)}
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
                <button className={styles.closeBtn} onClick={() => setSelectedTx(null)} aria-label="Tutup">
                  ×
                </button>
              </div>

              <div className={styles.detailBody}>
                <div className={styles.detailHead}>
                  <div
                    className={styles.txIconWrap}
                    style={{ width: '48px', height: '48px', background: `${detail.color}1F`, color: readableIconColor(detail.color) }}
                  >
                    <DynamicIcon name={detail.icon} size={22} />
                  </div>
                  <div>
                    <h4 className={styles.detailTitle}>{detail.title}</h4>
                    <span className={styles.detailSub}>
                      {formatDateLong(selectedTx.transaction_date)} · {formatTime(selectedTx.transaction_time)}
                    </span>
                  </div>
                </div>

                <div className={styles.detailAmountBox}>
                  <span className={styles.detailLabelInline}>Nominal</span>
                  <span
                    className={styles.detailAmount}
                    style={{
                      color:
                        selectedTx.type === 'income'
                          ? 'var(--color-success)'
                          : selectedTx.type === 'transfer'
                            ? 'var(--color-info)'
                            : 'var(--color-text-primary)',
                    }}
                  >
                    {selectedTx.type === 'income' ? '+' : selectedTx.type === 'expense' ? '-' : ''}
                    {formatCurrency(selectedTx.amount)}
                  </span>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailCell}>
                    <span className={styles.detailLabel}>{selectedTx.type === 'transfer' ? 'Akun' : 'Metode Pembayaran'}</span>
                    <span className={styles.detailValue}>{detail.accountLabel}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.detailLabel}>Tipe</span>
                    <span className={styles.detailValue}>
                      {selectedTx.type === 'income' ? 'Pemasukan' : selectedTx.type === 'expense' ? 'Pengeluaran' : 'Transfer'}
                    </span>
                  </div>
                </div>

                {selectedTx.note && (
                  <div className={styles.detailCell}>
                    <span className={styles.detailLabel}>Catatan / Deskripsi Detail</span>
                    <span className={styles.detailValue}>{selectedTx.note}</span>
                  </div>
                )}

                {selectedTx.recurring_id && (
                  <div className={styles.detailBadge}>
                    <Repeat size={13} /> Dicatat otomatis dari transaksi rutin
                  </div>
                )}
                {selectedTx.type === 'transfer' && (
                  <div className={styles.detailBadge}>
                    <ArrowLeftRight size={13} /> Transfer tidak dihitung sebagai pemasukan/pengeluaran
                  </div>
                )}
              </div>

              <div className={styles.detailActions}>
                <Button
                  variant="outline"
                  size="md"
                  icon={<Trash2 size={15} />}
                  className={styles.detailDeleteBtn}
                  onClick={() => setPendingDelete(selectedTx)}
                >
                  Hapus
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Pencil size={15} />}
                  onClick={() => navigate(editTransactionPath(selectedTx.id))}
                >
                  Edit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Hapus Transaksi?"
        description={
          pendingDelete ? (
            <>
              Transaksi <strong>{formatCurrency(pendingDelete.amount)}</strong> akan dihapus permanen dan saldo akun dikembalikan
              otomatis.
            </>
          ) : null
        }
        confirmLabel="Ya, Hapus"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
};
