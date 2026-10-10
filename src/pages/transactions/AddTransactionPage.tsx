// ============================================
// Fundly.id - Add / Edit Transaction Page
// Pengeluaran, Pemasukan, Transfer antar akun + transaksi berulang
// ============================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  Check,
  Tag,
  FileText,
  Calendar,
  Clock,
  Repeat,
  Trash2,
  Wallet,
} from 'lucide-react';
import { subDays } from 'date-fns';
import { Button } from '../../components/ui/Button/Button';
import { NumPad } from '../../components/ui/NumPad/NumPad';
import { Modal } from '../../components/ui/Modal/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog';
import { Field, Segmented, formStyles } from '../../components/ui/Form/Form';
import { PageLoader } from '../../components/ui/PageLoader/PageLoader';
import { formatNumpadDisplay, formatCurrency } from '../../utils/formatCurrency';
import { formatDateShort, formatDate, getCurrentTime, getTodayISO, toISODate } from '../../utils/formatDate';
import { DynamicIcon } from '../../utils/icons';
import { cn } from '../../utils/cn';
import { ROUTES } from '../../config/routes';
import { useFinanceStore } from '../../stores/financeStore';
import { useFinanceStatus } from '../../hooks/useFinance';
import type { RecurringFrequency, TransactionType } from '../../types/common';
import type { Account, Transaction } from '../../types/models';
import styles from './AddTransactionPage.module.css';

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Pengeluaran',
  income: 'Pemasukan',
  transfer: 'Transfer',
};

/** Efek sebuah transaksi terhadap saldo akun tertentu */
function balanceEffect(tx: Pick<Transaction, 'type' | 'amount' | 'account_id' | 'to_account_id' | 'status'>, accountId: string): number {
  if (tx.status !== 'cleared') return 0;
  if (tx.type === 'income' && tx.account_id === accountId) return tx.amount;
  if (tx.type === 'expense' && tx.account_id === accountId) return -tx.amount;
  if (tx.type === 'transfer') {
    if (tx.account_id === accountId) return -tx.amount;
    if (tx.to_account_id === accountId) return tx.amount;
  }
  return 0;
}

export const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(editId);

  const { isLoading } = useFinanceStatus();
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  const original = useMemo(
    () => (editId ? transactions.find((t) => t.id === editId) ?? null : null),
    [editId, transactions],
  );

  const initialType = (searchParams.get('type') as TransactionType) || 'expense';
  const [txType, setTxType] = useState<TransactionType>(
    ['expense', 'income', 'transfer'].includes(initialType) ? initialType : 'expense',
  );
  const [amount, setAmount] = useState('0');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(searchParams.get('account'));
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(getTodayISO());
  const [time, setTime] = useState(getCurrentTime());

  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [endDate, setEndDate] = useState('');
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const [openPicker, setOpenPicker] = useState<'category' | 'account' | 'toAccount' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hydratedRef = useRef(false);
  const amountRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Akun yang boleh dipilih: akun aktif + akun transaksi asal (meski diarsipkan)
  const selectableAccounts = useMemo(
    () =>
      accounts.filter(
        (a) => a.is_active || a.id === original?.account_id || a.id === original?.to_account_id,
      ),
    [accounts, original],
  );

  // Kategori diurutkan berdasarkan frekuensi pemakaian 90 hari terakhir
  const sortedCategories = useMemo(() => {
    if (txType === 'transfer') return [];
    const since = toISODate(subDays(new Date(), 90));
    const usage = new Map<string, number>();
    for (const t of transactions) {
      if (t.transaction_date < since) break;
      if (t.category_id) usage.set(t.category_id, (usage.get(t.category_id) || 0) + 1);
    }
    return categories
      .filter((c) => c.type === txType)
      .slice()
      .sort((a, b) => (usage.get(b.id) || 0) - (usage.get(a.id) || 0) || a.sort_order - b.sort_order);
  }, [categories, transactions, txType]);

  // ---- Hydrate form (edit mode) ----
  useEffect(() => {
    if (!isEdit || hydratedRef.current || isLoading) return;
    if (!original) {
      toast.error('Transaksi tidak ditemukan atau sudah dihapus.');
      navigate(ROUTES.TRANSACTIONS, { replace: true });
      return;
    }
    hydratedRef.current = true;
    setTxType(original.type);
    setAmount(String(original.amount));
    setNote(original.note || '');
    setCategoryId(original.category_id);
    setAccountId(original.account_id);
    setToAccountId(original.to_account_id);
    setDate(original.transaction_date);
    setTime(original.transaction_time.slice(0, 5));
  }, [isEdit, original, isLoading, navigate]);

  // ---- Default account selection ----
  useEffect(() => {
    if (isEdit) return;
    const active = accounts.filter((a) => a.is_active);
    if (active.length === 0) return;
    if (!accountId || !active.some((a) => a.id === accountId)) setAccountId(active[0].id);
  }, [accounts, accountId, isEdit]);

  useEffect(() => {
    if (txType !== 'transfer') return;
    if (!toAccountId || toAccountId === accountId) {
      const candidate = selectableAccounts.find((a) => a.id !== accountId && a.is_active);
      setToAccountId(candidate?.id ?? null);
    }
  }, [txType, accountId, toAccountId, selectableAccounts]);

  // Reset kategori jika tidak cocok dengan jenis transaksi
  useEffect(() => {
    if (!categoryId) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat || cat.type !== txType) setCategoryId(null);
  }, [txType, categoryId, categories]);

  useEffect(() => {
    if (txType === 'transfer') setRecurringEnabled(false);
  }, [txType]);

  const inputNumeric = parseInt(amount, 10) || 0;
  const selectedAccount: Account | undefined = accounts.find((a) => a.id === accountId);
  const selectedToAccount: Account | undefined = accounts.find((a) => a.id === toAccountId);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // ---- Realtime balance preview ----
  const { initialBalance, projectedBalance } = useMemo(() => {
    if (!selectedAccount) return { initialBalance: 0, projectedBalance: 0 };
    const base = selectedAccount.balance - (original ? balanceEffect(original, selectedAccount.id) : 0);
    const draftEffect = balanceEffect(
      {
        type: txType,
        amount: inputNumeric,
        account_id: selectedAccount.id,
        to_account_id: txType === 'transfer' ? toAccountId : null,
        status: original?.status ?? 'cleared',
      },
      selectedAccount.id,
    );
    return { initialBalance: base, projectedBalance: base + draftEffect };
  }, [selectedAccount, original, txType, inputNumeric, toAccountId]);

  // Animate amount on change
  useEffect(() => {
    if (!amountRef.current) return;
    gsap.fromTo(amountRef.current, { scale: 1.03 }, { scale: 1, duration: 0.15, ease: 'power2.out' });
  }, [amount]);

  const goBack = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(ROUTES.TRANSACTIONS, { replace: true });
  }, [navigate]);

  const validationError = (): string | null => {
    if (inputNumeric <= 0) return 'Masukkan nominal transaksi terlebih dahulu.';
    if (!selectedAccount) return 'Pilih akun / dompet terlebih dahulu.';
    if (txType === 'transfer') {
      if (!selectedToAccount) return 'Pilih akun tujuan transfer.';
      if (selectedToAccount.id === selectedAccount.id) return 'Akun tujuan harus berbeda dari akun sumber.';
    } else if (!selectedCategory) {
      return 'Pilih kategori transaksi.';
    }
    if (!date) return 'Tanggal transaksi tidak valid.';
    if (recurringEnabled && endDate && endDate < date) return 'Tanggal berakhir harus setelah tanggal mulai.';
    return null;
  };

  const handleSave = async () => {
    if (isSaving) return;
    const err = validationError();
    if (err) {
      toast.error(err);
      return;
    }

    const payload = {
      type: txType,
      amount: inputNumeric,
      account_id: selectedAccount!.id,
      to_account_id: txType === 'transfer' ? selectedToAccount!.id : null,
      category_id: txType === 'transfer' ? null : selectedCategory!.id,
      note: note.trim() || null,
      transaction_date: date,
      transaction_time: `${time || '00:00'}:00`.slice(0, 8),
    };

    setIsSaving(true);
    try {
      if (isEdit && editId) {
        await updateTransaction(editId, payload);
        toast.success('Transaksi berhasil diperbarui');
      } else {
        await addTransaction(
          payload,
          recurringEnabled && txType !== 'transfer' ? { frequency, end_date: endDate || null } : null,
        );
        const label = TYPE_LABELS[txType];
        toast.success(
          recurringEnabled
            ? `${label} berulang ${FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label.toLowerCase()} disimpan`
            : `${label} ${formatCurrency(inputNumeric)} berhasil disimpan`,
        );
      }
      goBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan transaksi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(editId);
      toast.success('Transaksi berhasil dihapus');
      setShowDelete(false);
      navigate(ROUTES.TRANSACTIONS, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus transaksi.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Physical Keyboard Listener (Desktop support)
  const saveRef = useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
  });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || document.querySelector('[role="dialog"]')) return;

      if (e.key >= '0' && e.key <= '9') {
        setAmount((prev) => (prev === '0' ? e.key : prev.length < 12 ? prev + e.key : prev));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setAmount((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void saveRef.current();
      } else if (e.key === 'Escape') {
        setOpenPicker(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openNativePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    try {
      el?.showPicker?.();
    } catch {
      el?.focus();
    }
  };

  if (isLoading) return <PageLoader message="Memuat data akun & kategori..." />;

  const formattedAmount = formatNumpadDisplay(inputNumeric);
  const noAccounts = selectableAccounts.length === 0;

  const renderAccountMenu = (current: string | null, onSelect: (id: string) => void, excludeId?: string | null) => (
    <motion.div
      className={styles.dropdownMenu}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
    >
      {selectableAccounts
        .filter((a) => a.id !== excludeId)
        .map((acc) => (
          <button
            key={acc.id}
            type="button"
            className={cn(styles.dropdownOption, current === acc.id && styles.optionActive)}
            onClick={() => {
              onSelect(acc.id);
              setOpenPicker(null);
            }}
          >
            <div className={styles.optionLeft}>
              <DynamicIcon name={acc.icon} size={16} color={acc.color} fallback={Wallet} />
              <span>
                {acc.name}
                <span className={styles.accountSubText}> · {formatCurrency(acc.balance)}</span>
              </span>
            </div>
            {current === acc.id && <Check size={14} color="var(--color-primary)" />}
          </button>
        ))}
      <button type="button" className={styles.dropdownOption} onClick={() => navigate(ROUTES.ACCOUNTS)}>
        <div className={styles.optionLeft}>
          <span className={styles.accountSubText}>+ Kelola akun & dompet</span>
        </div>
      </button>
    </motion.div>
  );

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={goBack} aria-label="Kembali">
          <ChevronLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>{isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}</h1>
        {isEdit ? (
          <button className={cn(styles.backBtn, styles.deleteBtn)} onClick={() => setShowDelete(true)} aria-label="Hapus transaksi">
            <Trash2 size={18} />
          </button>
        ) : (
          <span className={styles.headerDate}>{formatDateShort(date)}</span>
        )}
      </div>

      {/* Main Switcher Tab: Pengeluaran / Pemasukan / Transfer */}
      <div className={styles.mainTabWrapper}>
        <div className={styles.mainTypeTabs}>
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                styles.mainTypeTab,
                txType === t && t === 'expense' && styles.mainTypeTabExpense,
                txType === t && t === 'income' && styles.mainTypeTabIncome,
                txType === t && t === 'transfer' && styles.mainTypeTabTransfer,
              )}
              onClick={() => {
                setTxType(t);
                setOpenPicker(null);
              }}
            >
              {txType === t && (
                <motion.div
                  className={styles.activeTabPill}
                  layoutId="add-tx-tab-active"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className={styles.tabText}>{TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Realtime Balance -> Sisa Saldo Header */}
      <div className={styles.realtimeHeader}>
        <div className={styles.realtimeItemLeft}>
          <span className={styles.realtimeLabel}>Saldo {selectedAccount?.name || 'Awal'}</span>
          <span className={styles.realtimeValue}>{formatCurrency(initialBalance)}</span>
        </div>

        <ArrowRight size={18} className={styles.realtimeArrow} />

        <div className={styles.realtimeItemRight}>
          <span className={styles.realtimeLabel}>Sisa Saldo</span>
          <span
            className={cn(
              styles.realtimeValue,
              projectedBalance < 0 ? styles.textDanger : projectedBalance < initialBalance ? styles.textExpense : styles.textIncome,
            )}
          >
            {formatCurrency(projectedBalance)}
          </span>
        </div>
      </div>

      {/* Input Display Area */}
      <div className={styles.amountCard} ref={amountRef}>
        <span className={styles.amountPrefix}>Rp.</span>
        <span className={cn(styles.amountValue, amount === '0' && styles.amountPlaceholder)}>{formattedAmount}</span>
      </div>

      {/* Selectors Row */}
      <div className={styles.selectorsRow}>
        {txType === 'transfer' ? (
          <>
            <div className={styles.dropdownContainer}>
              <button
                type="button"
                className={cn(styles.dropdownTrigger, !selectedAccount && styles.dropdownPlaceholder)}
                onClick={() => setOpenPicker(openPicker === 'account' ? null : 'account')}
              >
                <div className={styles.triggerLeft}>
                  <span className={styles.triggerPrefix}>Dari</span>
                  <span className={styles.triggerText}>{selectedAccount?.name || 'Pilih akun'}</span>
                </div>
                <ChevronDown size={16} />
              </button>
              <AnimatePresence>{openPicker === 'account' && renderAccountMenu(accountId, setAccountId)}</AnimatePresence>
            </div>
            <div className={styles.dropdownContainer}>
              <button
                type="button"
                className={cn(styles.dropdownTrigger, !selectedToAccount && styles.dropdownPlaceholder)}
                onClick={() => setOpenPicker(openPicker === 'toAccount' ? null : 'toAccount')}
              >
                <div className={styles.triggerLeft}>
                  <span className={styles.triggerPrefix}>Ke</span>
                  <span className={styles.triggerText}>{selectedToAccount?.name || 'Pilih akun'}</span>
                </div>
                <ChevronDown size={16} />
              </button>
              <AnimatePresence>
                {openPicker === 'toAccount' && renderAccountMenu(toAccountId, setToAccountId, accountId)}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <>
            {/* Category Selector Dropdown */}
            <div className={styles.dropdownContainer}>
              <button
                type="button"
                className={cn(styles.dropdownTrigger, !selectedCategory && styles.dropdownPlaceholder)}
                onClick={() => setOpenPicker(openPicker === 'category' ? null : 'category')}
              >
                <div className={styles.triggerLeft}>
                  {selectedCategory ? (
                    <>
                      <DynamicIcon name={selectedCategory.icon} size={16} />
                      <span className={styles.triggerText}>{selectedCategory.name}</span>
                    </>
                  ) : (
                    <>
                      <Tag size={16} />
                      <span className={styles.triggerText}>Pilih Kategori...</span>
                    </>
                  )}
                </div>
                <ChevronDown size={16} />
              </button>

              <AnimatePresence>
                {openPicker === 'category' && (
                  <motion.div
                    className={styles.dropdownMenu}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  >
                    {sortedCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={cn(styles.dropdownOption, categoryId === cat.id && styles.optionActive)}
                        onClick={() => {
                          setCategoryId(cat.id);
                          setOpenPicker(null);
                        }}
                      >
                        <div className={styles.optionLeft}>
                          <DynamicIcon name={cat.icon} size={16} color={cat.color} />
                          <span>{cat.name}</span>
                        </div>
                        {categoryId === cat.id && <Check size={14} color="var(--color-primary)" />}
                      </button>
                    ))}
                    <button type="button" className={styles.dropdownOption} onClick={() => navigate(`${ROUTES.SETTINGS}?tab=categories`)}>
                      <div className={styles.optionLeft}>
                        <span className={styles.accountSubText}>+ Kelola kategori</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Account Selector Dropdown */}
            <div className={styles.dropdownContainer}>
              <button
                type="button"
                className={cn(styles.dropdownTrigger, !selectedAccount && styles.dropdownPlaceholder)}
                onClick={() => setOpenPicker(openPicker === 'account' ? null : 'account')}
              >
                <div className={styles.triggerLeft}>
                  <DynamicIcon name={selectedAccount?.icon} size={18} fallback={Wallet} />
                  <span className={styles.triggerText}>{selectedAccount?.name || (noAccounts ? 'Belum ada akun' : 'Pilih akun')}</span>
                </div>
                <ChevronDown size={16} />
              </button>
              <AnimatePresence>{openPicker === 'account' && renderAccountMenu(accountId, setAccountId)}</AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Date, Time & Recurring Meta Row */}
      <div className={styles.metaRow}>
        <label className={styles.metaPill} onClick={() => openNativePicker(dateInputRef)}>
          <Calendar size={14} />
          <span>{date === getTodayISO() ? 'Hari ini' : formatDate(date, 'dd MMM yyyy')}</span>
          <input
            ref={dateInputRef}
            type="date"
            className={styles.metaHiddenInput}
            value={date}
            max={recurringEnabled ? undefined : toISODate(new Date(new Date().getFullYear() + 1, 11, 31))}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Tanggal transaksi"
          />
        </label>
        <label className={styles.metaPill} onClick={() => openNativePicker(timeInputRef)}>
          <Clock size={14} />
          <span>{time}</span>
          <input
            ref={timeInputRef}
            type="time"
            className={styles.metaHiddenInput}
            value={time}
            onChange={(e) => e.target.value && setTime(e.target.value)}
            aria-label="Jam transaksi"
          />
        </label>
        {!isEdit && txType !== 'transfer' && (
          <button
            type="button"
            className={cn(styles.metaPill, recurringEnabled && styles.metaPillActive)}
            onClick={() => setShowRecurringModal(true)}
          >
            <Repeat size={14} />
            <span>{recurringEnabled ? FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label : 'Ulangi'}</span>
          </button>
        )}
        {isEdit && original?.recurring_id && (
          <span className={cn(styles.metaPill, styles.metaPillStatic)}>
            <Repeat size={14} />
            <span>Dari transaksi rutin</span>
          </span>
        )}
      </div>

      {/* Optional Note / Deskripsi Field */}
      <div className={styles.noteInputWrapper}>
        <FileText size={16} className={styles.noteIcon} />
        <input
          type="text"
          placeholder="Catatan / Deskripsi detail (opsional)..."
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSave();
          }}
          className={styles.noteInput}
        />
      </div>

      {/* Save Button */}
      <div className={styles.actionWrapper}>
        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={handleSave}
          loading={isSaving}
          disabled={amount === '0' || noAccounts}
          className={styles.saveBtn}
        >
          {isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi'}
        </Button>
      </div>

      {/* NumPad */}
      <NumPad value={amount} onChange={(v) => setAmount(v === '' ? '0' : v)} />

      {/* Recurring Settings Modal */}
      <Modal isOpen={showRecurringModal} onClose={() => setShowRecurringModal(false)} size="sm" title="Transaksi Berulang">
        <div className={formStyles.form}>
          <Segmented
            options={[
              { value: 'off', label: 'Sekali Saja' },
              { value: 'on', label: 'Ulangi Otomatis' },
            ]}
            value={recurringEnabled ? 'on' : 'off'}
            onChange={(v) => setRecurringEnabled(v === 'on')}
            accent
          />
          {recurringEnabled && (
            <>
              <Field label="Frekuensi">
                <div className={formStyles.chipRow}>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className={cn(formStyles.chip, frequency === f.value && formStyles.chipActive)}
                      onClick={() => setFrequency(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Berakhir pada (opsional)" hint="Kosongkan jika transaksi berulang tanpa batas waktu.">
                <input
                  type="date"
                  className={formStyles.input}
                  value={endDate}
                  min={date}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
              <p className={formStyles.hint}>
                Mulai {formatDate(date)}. Transaksi akan tercatat otomatis setiap periode dan saldo akun diperbarui. Kelola
                transaksi rutin di menu Pengaturan.
              </p>
            </>
          )}
          <div className={formStyles.actions}>
            <Button variant="primary" size="md" onClick={() => setShowRecurringModal(false)} fullWidth>
              Selesai
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDelete}
        title="Hapus Transaksi?"
        description="Transaksi ini akan dihapus permanen dan saldo akun terkait akan dikembalikan otomatis."
        confirmLabel="Ya, Hapus"
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
      />
    </div>
  );
};
