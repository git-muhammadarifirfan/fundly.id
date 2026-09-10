// ============================================
// Fundly.id — Add Transaction Page (100% Exact Match Design)
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  Utensils,
  Car,
  ShoppingCart,
  Gamepad2,
  Heart,
  Wallet,
  Building2,
  Check,
  Tag,
  HandCoins,
  Receipt,
  MoreHorizontal,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { NumPad } from '../../components/ui/NumPad/NumPad';
import { formatNumpadDisplay, formatCurrency } from '../../utils/formatCurrency';
import { cn } from '../../utils/cn';
import styles from './AddTransactionPage.module.css';

import { motion, AnimatePresence } from 'framer-motion';

type TxType = 'expense' | 'income';

export interface CategoryOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'makanan', name: 'Makanan', icon: Utensils },
  { id: 'transport', name: 'Transport & Tol', icon: Car },
  { id: 'pinjaman', name: 'Pinjam & Utang', icon: HandCoins },
  { id: 'tagihan', name: 'Tagihan', icon: Receipt },
  { id: 'belanja', name: 'Belanja', icon: ShoppingCart },
  { id: 'hiburan', name: 'Hiburan', icon: Gamepad2 },
  { id: 'kesehatan', name: 'Kesehatan', icon: Heart },
  { id: 'lainnya', name: 'Lainnya', icon: MoreHorizontal },
];

const ACCOUNTS = [
  { id: 'cash', name: 'Tunai (Cash)', icon: Wallet, balance: 120000000 },
  { id: 'bank', name: 'Bank', icon: Building2, balance: 8500000000 },
];

export const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const [txType, setTxType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('0');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const amountRef = useRef<HTMLDivElement>(null);

  const inputNumeric = parseInt(amount) || 0;

  // Realtime calculation (dalam sen untuk formatCurrency):
  const initialBalanceSen = selectedAccount.balance;
  const inputSen = inputNumeric * 100;

  const updatedBalanceSen =
    txType === 'expense'
      ? initialBalanceSen - inputSen
      : initialBalanceSen + inputSen;

  // Animate amount on change
  useEffect(() => {
    if (!amountRef.current) return;
    gsap.fromTo(
      amountRef.current,
      { scale: 1.03 },
      { scale: 1, duration: 0.15, ease: 'power2.out' },
    );
  }, [amount]);

  // Physical Keyboard Listener (Desktop support)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text inputs (e.g. Note/Deskripsi)
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key >= '0' && e.key <= '9') {
        setAmount((prev) => (prev === '0' ? e.key : prev.length < 12 ? prev + e.key : prev));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setAmount((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
      } else if (e.key === 'Enter') {
        if (inputNumeric > 0 && selectedCategory) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputNumeric, selectedCategory]);

  const formattedAmount = formatNumpadDisplay(inputNumeric);
  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  const handleSave = () => {
    if (inputNumeric === 0 || !selectedCategory) return;

    alert(
      `Berhasil menyimpan ${txType === 'expense' ? 'Pengeluaran' : 'Pemasukan'} Rp ${formattedAmount} (${selectedCategory.name} via ${selectedAccount.name})!`
    );
    navigate(-1);
  };

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Kembali">
          <ChevronLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Tambah Transaksi</h1>
        <span className={styles.headerDate}>{formattedDate}</span>
      </div>

      {/* Main Switcher Tab: Pengeluaran / Pemasukan (Framer Motion Sliding Pill) */}
      <div className={styles.mainTabWrapper}>
        <div className={styles.mainTypeTabs}>
          <button
            className={cn(styles.mainTypeTab, txType === 'expense' && styles.mainTypeTabExpense)}
            onClick={() => setTxType('expense')}
          >
            {txType === 'expense' && (
              <motion.div
                className={styles.activeTabPill}
                layoutId="add-tx-tab-active"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className={styles.tabText}>Pengeluaran</span>
          </button>
          <button
            className={cn(styles.mainTypeTab, txType === 'income' && styles.mainTypeTabIncome)}
            onClick={() => setTxType('income')}
          >
            {txType === 'income' && (
              <motion.div
                className={styles.activeTabPill}
                layoutId="add-tx-tab-active"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className={styles.tabText}>Pemasukan</span>
          </button>
        </div>
      </div>

      {/* Realtime Balance -> Sisa Saldo Header */}
      <div className={styles.realtimeHeader}>
        <div className={styles.realtimeItemLeft}>
          <span className={styles.realtimeLabel}>Saldo Awal</span>
          <span className={styles.realtimeValue}>{formatCurrency(initialBalanceSen)}</span>
        </div>

        <ArrowRight size={18} className={styles.realtimeArrow} />

        <div className={styles.realtimeItemRight}>
          <span className={styles.realtimeLabel}>Sisa Saldo</span>
          <span
            className={cn(
              styles.realtimeValue,
              updatedBalanceSen < initialBalanceSen ? styles.textExpense : styles.textIncome
            )}
          >
            {formatCurrency(updatedBalanceSen)}
          </span>
        </div>
      </div>

      {/* Input Display Area (Exact Card Container) */}
      <div className={styles.amountCard} ref={amountRef}>
        <span className={styles.amountPrefix}>Rp.</span>
        <span className={cn(styles.amountValue, amount === '0' && styles.amountPlaceholder)}>
          {formattedAmount}
        </span>
      </div>

      {/* Selectors Row: Category & Account Custom Reusable Dropdown Component */}
      <div className={styles.selectorsRow}>
        {/* Category Selector Dropdown */}
        <div className={styles.dropdownContainer}>
          <button
            className={cn(styles.dropdownTrigger, !selectedCategory && styles.dropdownPlaceholder)}
            onClick={() => {
              setShowCategoryPicker(!showCategoryPicker);
              setShowAccountPicker(false);
            }}
          >
            <div className={styles.triggerLeft}>
              {selectedCategory ? (
                <>
                  <selectedCategory.icon size={16} />
                  <span>{selectedCategory.name}</span>
                </>
              ) : (
                <>
                  <Tag size={16} />
                  <span>Pilih Kategori...</span>
                </>
              )}
            </div>
            <ChevronDown size={16} />
          </button>

          <AnimatePresence>
            {showCategoryPicker && (
              <motion.div
                className={styles.dropdownMenu}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    className={cn(styles.dropdownOption, selectedCategory?.id === cat.id && styles.optionActive)}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <div className={styles.optionLeft}>
                      <cat.icon size={16} />
                      <span>{cat.name}</span>
                    </div>
                    {selectedCategory?.id === cat.id && <Check size={14} color="var(--color-primary)" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Account Selector Dropdown */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownTrigger}
            onClick={() => {
              setShowAccountPicker(!showAccountPicker);
              setShowCategoryPicker(false);
            }}
          >
            <div className={styles.triggerLeft}>
              <selectedAccount.icon size={18} />
              <span>{selectedAccount.name}</span>
            </div>
            <ChevronDown size={16} />
          </button>

          <AnimatePresence>
            {showAccountPicker && (
              <motion.div
                className={styles.dropdownMenu}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              >
                {ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    className={cn(styles.dropdownOption, selectedAccount.id === acc.id && styles.optionActive)}
                    onClick={() => {
                      setSelectedAccount(acc);
                      setShowAccountPicker(false);
                    }}
                  >
                    <div className={styles.optionLeft}>
                      <acc.icon size={16} />
                      <div>
                        <div>{acc.name}</div>
                        <div className={styles.accountSubText}>{formatCurrency(acc.balance)}</div>
                      </div>
                    </div>
                    {selectedAccount.id === acc.id && <Check size={14} color="var(--color-primary)" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Optional Note / Deskripsi Field */}
      <div className={styles.noteInputWrapper}>
        <FileText size={16} className={styles.noteIcon} />
        <input
          type="text"
          placeholder="Catatan / Deskripsi detail (opsional)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={styles.noteInput}
        />
      </div>

      {/* Save Button (Lime Green Rounded Pill) */}
      <div className={styles.actionWrapper}>
        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={handleSave}
          disabled={amount === '0' || !selectedCategory}
          className={styles.saveBtn}
        >
          Simpan Transaksi
        </Button>
      </div>

      {/* NumPad */}
      <NumPad value={amount} onChange={setAmount} />
    </div>
  );
};

