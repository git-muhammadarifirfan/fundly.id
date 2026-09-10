// ============================================
// Fundly.id — Dribbble-Inspired Budget & Target Page (Full CRUD + Modals & Error Handling)
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Utensils,
  Car,
  ShoppingCart,
  Gamepad2,
  Receipt,
  Heart,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Target,
  GraduationCap,
  Palmtree,
  PieChart,
  ShieldCheck,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber/AnimatedNumber';
import { SelectDropdown } from '../../components/ui/SelectDropdown/SelectDropdown';
import { formatCurrency } from '../../utils/formatCurrency';
import { cn } from '../../utils/cn';
import styles from './BudgetPage.module.css';

export interface BudgetItem {
  id: string;
  category: string;
  spent: number;
  limit: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  accentColor: string;
}

export interface GoalItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  current: number;
  target: number;
  color: string;
  deadline: string;
}

const INITIAL_BUDGETS: BudgetItem[] = [
  { id: 'b1', category: 'Makanan & Kuliner', spent: 4550000, limit: 6000000, icon: Utensils, accentColor: '#C6E83B' },
  { id: 'b2', category: 'Transportasi & Tol', spent: 2600000, limit: 3000000, icon: Car, accentColor: '#5AC8FA' },
  { id: 'b3', category: 'Belanja Bulanan', spent: 3250000, limit: 4000000, icon: ShoppingCart, accentColor: '#1C1C1E' },
  { id: 'b4', category: 'Hiburan & Hobi', spent: 1040000, limit: 2000000, icon: Gamepad2, accentColor: '#AF52DE' },
  { id: 'b5', category: 'Tagihan & Utility', spent: 1560000, limit: 2000000, icon: Receipt, accentColor: '#FF9500' },
  { id: 'b6', category: 'Kesehatan & Obat', spent: 500000, limit: 1500000, icon: Heart, accentColor: '#34C759' },
];

const INITIAL_GOALS: GoalItem[] = [
  { id: 'g1', name: 'Dana Darurat 6 Bulan', icon: ShieldCheck, current: 45000000, target: 60000000, color: '#C6E83B', deadline: 'Desember 2026' },
  { id: 'g2', name: 'Beli Mobil Impian', icon: Car, current: 65000000, target: 100000000, color: '#5AC8FA', deadline: 'Juni 2027' },
  { id: 'g3', name: 'Dana Pendidikan Anak', icon: GraduationCap, current: 24000000, target: 50000000, color: '#AF52DE', deadline: 'Desember 2028' },
  { id: 'g4', name: 'Liburan Jepang 2027', icon: Palmtree, current: 16000000, target: 20000000, color: '#FF9500', deadline: 'Maret 2027' },
];

type BudgetFilter = 'all' | 'warning' | 'safe';

export const BudgetPage: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetItem[]>(INITIAL_BUDGETS);
  const [goals, setGoals] = useState<GoalItem[]>(INITIAL_GOALS);
  const [filter, setFilter] = useState<BudgetFilter>('all');

  // Modal State
  const [activeModal, setActiveModal] = useState<'addBudget' | 'editBudget' | 'addGoal' | 'editGoal' | 'deleteConfirm' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'budget' | 'goal'; id: string; name: string } | null>(null);

  // Form State Budget
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState('Makanan & Kuliner');
  const [formLimit, setFormLimit] = useState('');

  // Form State Goal
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formGoalName, setFormGoalName] = useState('');
  const [formGoalTarget, setFormGoalTarget] = useState('');
  const [formGoalCurrent, setFormGoalCurrent] = useState('');
  const [formGoalMonth, setFormGoalMonth] = useState('Desember');
  const [formGoalYear, setFormGoalYear] = useState('2027');

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const filteredBudgets = budgets.filter((b) => {
    const pct = (b.spent / b.limit) * 100;
    if (filter === 'warning') return pct >= 80;
    if (filter === 'safe') return pct < 80;
    return true;
  });

  // Trigger Toast Notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // GSAP Progress Bar Animation
  useEffect(() => {
    if (!containerRef.current) return;
    const bars = containerRef.current.querySelectorAll(`.${styles.progressFill}`);
    gsap.fromTo(
      bars,
      { width: '0%' },
      { width: (i, target) => (target as HTMLElement).dataset.width + '%', duration: 0.8, ease: 'power2.out', stagger: 0.08 }
    );
  }, [filter, budgets]);

  // Open Add Budget Modal
  const openAddBudgetModal = () => {
    setFormCategory('Makanan & Kuliner');
    setFormLimit('');
    setErrorMessage(null);
    setActiveModal('addBudget');
  };

  // Helper format rupiah input (e.g. 6000000 -> "6.000.000")
  const formatRupiahInput = (val: string | number) => {
    if (!val && val !== 0) return '';
    const cleanNum = val.toString().replace(/\D/g, '');
    if (!cleanNum) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(cleanNum, 10));
  };

  // Open Edit Budget Modal
  const openEditBudgetModal = (item: BudgetItem) => {
    setEditingBudgetId(item.id);
    setFormCategory(item.category);
    setFormLimit(formatRupiahInput(item.limit));
    setErrorMessage(null);
    setActiveModal('editBudget');
  };

  // Open Add Goal Modal (Default current money set to total spent or 0 formatted)
  const openAddGoalModal = () => {
    setFormGoalName('');
    setFormGoalTarget('');
    setFormGoalCurrent('0');
    setFormGoalMonth('Desember');
    setFormGoalYear('2027');
    setErrorMessage(null);
    setActiveModal('addGoal');
  };

  // Open Edit Goal Modal
  const openEditGoalModal = (item: GoalItem) => {
    setEditingGoalId(item.id);
    setFormGoalName(item.name);
    setFormGoalTarget(formatRupiahInput(item.target));
    setFormGoalCurrent(formatRupiahInput(item.current));
    
    // Parse deadline string e.g. "Desember 2027" or "Maret 2027"
    const parts = item.deadline.split(' ');
    if (parts.length >= 2) {
      setFormGoalMonth(parts[0]);
      setFormGoalYear(parts[1]);
    } else {
      setFormGoalMonth('Desember');
      setFormGoalYear('2027');
    }

    setErrorMessage(null);
    setActiveModal('editGoal');
  };

  // Open Delete Confirm Modal
  const openDeleteConfirm = (type: 'budget' | 'goal', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setActiveModal('deleteConfirm');
  };

  // Handle Save Budget (Add / Edit)
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseInt(formLimit.replace(/\D/g, ''));

    if (isNaN(limitNum) || limitNum <= 0) {
      setErrorMessage('Nominal limit harus angka yang valid & lebih besar dari 0!');
      return;
    }

    if (activeModal === 'addBudget') {
      const exists = budgets.some((b) => b.category.toLowerCase() === formCategory.toLowerCase());
      if (exists) {
        setErrorMessage(`Anggaran untuk kategori ${formCategory} sudah ada!`);
        return;
      }

      const newEntry: BudgetItem = {
        id: `b-${Date.now()}`,
        category: formCategory,
        spent: 0,
        limit: limitNum,
        icon: ShoppingCart,
        accentColor: '#C6E83B',
      };
      setBudgets([newEntry, ...budgets]);
      showToast(`Berhasil menambahkan anggaran ${formCategory}`);
    } else if (activeModal === 'editBudget' && editingBudgetId) {
      setBudgets(
        budgets.map((b) =>
          b.id === editingBudgetId
            ? { ...b, category: formCategory, limit: limitNum }
            : b
        )
      );
      showToast(`Berhasil meng-update anggaran ${formCategory}`);
    }

    setActiveModal(null);
  };

  // Handle Save Goal (Add / Edit)
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseInt(formGoalTarget.replace(/\D/g, ''));
    const currentNum = parseInt(formGoalCurrent.replace(/\D/g, '')) || 0;
    const deadlineStr = `${formGoalMonth} ${formGoalYear}`;

    if (!formGoalName.trim()) {
      setErrorMessage('Nama target tidak boleh kosong!');
      return;
    }
    if (isNaN(targetNum) || targetNum <= 0) {
      setErrorMessage('Nominal target harus lebih besar dari 0!');
      return;
    }

    if (activeModal === 'addGoal') {
      const newGoal: GoalItem = {
        id: `g-${Date.now()}`,
        name: formGoalName,
        icon: Target,
        current: currentNum,
        target: targetNum,
        color: '#5AC8FA',
        deadline: deadlineStr,
      };
      setGoals([...goals, newGoal]);
      showToast(`Berhasil membuat target ${formGoalName}`);
    } else if (activeModal === 'editGoal' && editingGoalId) {
      setGoals(
        goals.map((g) =>
          g.id === editingGoalId
            ? { ...g, name: formGoalName, target: targetNum, current: currentNum, deadline: deadlineStr }
            : g
        )
      );
      showToast(`Berhasil meng-update target ${formGoalName}`);
    }

    setActiveModal(null);
  };

  // Confirm Delete Handler
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'budget') {
      setBudgets(budgets.filter((b) => b.id !== deleteTarget.id));
      showToast(`Anggaran "${deleteTarget.name}" berhasil dihapus`);
    } else {
      setGoals(goals.filter((g) => g.id !== deleteTarget.id));
      showToast(`Target "${deleteTarget.name}" berhasil dihapus`);
    }

    setActiveModal(null);
    setDeleteTarget(null);
  };

  return (
    <div className={styles.page} ref={containerRef}>
      {/* Top Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Anggaran & Target Finansial</h1>
          <p className={styles.pageSubtitle}>Kelola batas alokasi pengeluaran & impian tabungan Anda</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" size="md" icon={<Target size={16} />} onClick={openAddGoalModal}>
            Tambah Target
          </Button>
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openAddBudgetModal}>
            Tambah Anggaran
          </Button>
        </div>
      </div>

      {/* Dribbble Hero Overview Card */}
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div className={styles.heroBadge}>
            <div className={styles.heroBadgeIcon}>
              <PieChart size={15} />
            </div>
            <span>Overview Alokasi Anggaran</span>
          </div>
          <span className={styles.monthPill}>Oktober 2026</span>
        </div>

        <div className={styles.heroBody}>
          <div className={styles.heroMainStat}>
            <span className={styles.heroLabel}>Total Pengeluaran / Total Limit</span>
            <div className={styles.heroAmountRow}>
              <AnimatedNumber value={totalSpent} className={styles.heroAmount} />
              <span className={styles.heroLimit}>/ {formatCurrency(totalLimit)}</span>
            </div>
          </div>

          <div className={styles.heroGaugePill}>
            <span className={styles.heroGaugePct}>{totalPct}%</span>
            <span className={styles.heroGaugeText}>Terpakai</span>
          </div>
        </div>

        {/* Hero Progress Bar */}
        <div className={styles.heroProgressBarTrack}>
          <div
            className={styles.heroProgressBarFill}
            style={{ width: `${Math.min(totalPct, 100)}%` }}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: ANGGARAN BULANAN (BUDGET CARDS) */}
      {/* ============================================================ */}
      <div className={styles.sectionTitleRow}>
        <div className={styles.sectionHeaderTitle}>
          <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
          <h2>Alokasi Anggaran Bulanan</h2>
          <span className={styles.periodPill}>Per Bulan</span>
        </div>
        <div className={styles.filterTabs}>
          <button
            className={cn(styles.filterTab, filter === 'all' && styles.filterActive)}
            onClick={() => setFilter('all')}
          >
            Semua ({budgets.length})
          </button>
          <button
            className={cn(styles.filterTab, filter === 'warning' && styles.filterActive)}
            onClick={() => setFilter('warning')}
          >
            <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
            Batas Limit
          </button>
          <button
            className={cn(styles.filterTab, filter === 'safe' && styles.filterActive)}
            onClick={() => setFilter('safe')}
          >
            <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
            Aman
          </button>
        </div>
      </div>

      <div className={styles.budgetGrid}>
        {filteredBudgets.map((item) => {
          const pct = Math.round((item.spent / item.limit) * 100);
          const isOver = pct > 100;
          const isWarning = pct >= 80 && pct <= 100;
          const IconComp = item.icon;

          return (
            <motion.div
              key={item.id}
              className={styles.budgetCard}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardTopLeft}>
                  <div className={styles.cardIconBox} style={{ background: `${item.accentColor}1F`, color: item.accentColor === '#1C1C1E' ? 'var(--color-text-primary)' : item.accentColor }}>
                    <IconComp size={20} />
                  </div>
                  <div className={styles.cardHeaderInfo}>
                    <h3 className={styles.cardTitle}>{item.category}</h3>
                    <span className={cn(styles.statusBadge, isOver ? styles.statusOver : isWarning ? styles.statusWarning : styles.statusSafe)}>
                      {isOver ? 'Kelebihan' : isWarning ? 'Waspada' : 'Aman'}
                    </span>
                  </div>
                </div>

                <div className={styles.cardActionBtns}>
                  <button className={styles.iconBtn} onClick={() => openEditBudgetModal(item)} title="Edit Anggaran">
                    <Edit2 size={14} />
                  </button>
                  <button className={cn(styles.iconBtn, styles.iconBtnDanger)} onClick={() => openDeleteConfirm('budget', item.id, item.category)} title="Hapus Anggaran">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className={styles.cardMiddle}>
                <div className={styles.amountDisplay}>
                  <AnimatedNumber value={item.spent} className={styles.spentAmount} />
                  <span className={styles.limitAmount}>dari {formatCurrency(item.limit)}</span>
                </div>
                <span className={styles.pctBadge}>{pct}%</span>
              </div>

              <div className={styles.progressTrack}>
                <div
                  className={cn(styles.progressFill, isOver && styles.fillOver, isWarning && styles.fillWarning)}
                  data-width={Math.min(pct, 100)}
                  style={{ background: isOver ? 'var(--color-danger)' : isWarning ? 'var(--color-warning)' : item.accentColor }}
                />
              </div>

              <div className={styles.cardBottom}>
                <span className={styles.remainingText}>
                  {isOver
                    ? `Kelebihan ${formatCurrency(item.spent - item.limit)}`
                    : `Sisa anggaran ${formatCurrency(item.limit - item.spent)}`}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* SECTION 2: TARGET FINANSIAL (GOALS CARDS) */}
      {/* ============================================================ */}
      <div className={styles.sectionTitleRow} style={{ marginTop: 'var(--space-6)' }}>
        <div className={styles.sectionHeaderTitle}>
          <Target size={20} style={{ color: 'var(--color-primary)' }} />
          <h2>Target Tabungan & Impian (Goals)</h2>
        </div>
      </div>

      <div className={styles.goalsGrid}>
        {goals.map((goal) => {
          const IconComp = goal.icon;
          const pct = Math.round((goal.current / goal.target) * 100);
          const isDone = pct >= 100;

          return (
            <motion.div 
              key={goal.id} 
              className={styles.goalCard}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.goalCardTop}>
                <div className={styles.goalIconCircle} style={{ background: `${goal.color}20`, color: goal.color === '#1C1C1E' ? 'var(--color-text-primary)' : goal.color }}>
                  <IconComp size={22} />
                </div>
                <div className={styles.cardActionBtns}>
                  <button className={styles.iconBtn} onClick={() => openEditGoalModal(goal)} title="Edit Target">
                    <Edit2 size={14} />
                  </button>
                  <button className={cn(styles.iconBtn, styles.iconBtnDanger)} onClick={() => openDeleteConfirm('goal', goal.id, goal.name)} title="Hapus Target">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className={styles.goalCardTitle}>{goal.name}</h3>
              <p className={styles.goalDeadlineText}>Target s/d {goal.deadline}</p>

              <div className={styles.goalAmountRow}>
                <AnimatedNumber value={goal.current} className={styles.goalCurrentVal} />
                <span className={styles.goalTargetVal}>/ {formatCurrency(goal.target)}</span>
              </div>

              <div className={styles.goalTrack}>
                <div
                  className={styles.goalFill}
                  style={{ width: `${Math.min(pct, 100)}%`, background: goal.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ADD / EDIT BUDGET */}
      {/* ============================================================ */}
      <AnimatePresence>
        {(activeModal === 'addBudget' || activeModal === 'editBudget') && (
          <motion.div
            className={styles.modalOverlay}
            onClick={() => setActiveModal(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {activeModal === 'addBudget' ? 'Tambah Anggaran Baru' : 'Edit Anggaran Kategori'}
                </h3>
                <button className={styles.closeBtn} onClick={() => setActiveModal(null)}>
                  <X size={18} />
                </button>
              </div>

              {errorMessage && (
                <div className={styles.errorAlert}>
                  <AlertCircle size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveBudget} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Kategori</label>
                  <SelectDropdown
                    fullWidth
                    value={formCategory}
                    onChange={(val) => setFormCategory(val)}
                    options={[
                      { value: 'Makanan & Kuliner', label: 'Makanan & Kuliner', icon: Utensils },
                      { value: 'Transportasi & Tol', label: 'Transportasi & Tol', icon: Car },
                      { value: 'Belanja Bulanan', label: 'Belanja Bulanan', icon: ShoppingCart },
                      { value: 'Hiburan & Hobi', label: 'Hiburan & Hobi', icon: Gamepad2 },
                      { value: 'Tagihan & Utility', label: 'Tagihan & Utility', icon: Receipt },
                      { value: 'Kesehatan & Obat', label: 'Kesehatan & Obat', icon: Heart },
                    ]}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Batas Limit Anggaran Per Bulan (Rp)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 5.000.000"
                    value={formLimit}
                    onChange={(e) => setFormLimit(formatRupiahInput(e.target.value))}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.modalFooter}>
                  <Button variant="ghost" size="md" type="button" onClick={() => setActiveModal(null)}>
                    Batal
                  </Button>
                  <Button variant="primary" size="md" type="submit">
                    Simpan Anggaran
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 2: ADD / EDIT GOAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {(activeModal === 'addGoal' || activeModal === 'editGoal') && (
          <motion.div
            className={styles.modalOverlay}
            onClick={() => setActiveModal(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {activeModal === 'addGoal' ? 'Tambah Target Finansial Baru' : 'Edit Target Finansial'}
                </h3>
                <button className={styles.closeBtn} onClick={() => setActiveModal(null)}>
                  <X size={18} />
                </button>
              </div>

              {errorMessage && (
                <div className={styles.errorAlert}>
                  <AlertCircle size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveGoal} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Nama Target</label>
                  <input
                    type="text"
                    placeholder="Misal: Beli Mobil Impian"
                    value={formGoalName}
                    onChange={(e) => setFormGoalName(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Target Nominal (Rp)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 100.000.000"
                    value={formGoalTarget}
                    onChange={(e) => setFormGoalTarget(formatRupiahInput(e.target.value))}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Jumlah Terkumpul Saat Ini (Rp)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 45.000.000"
                    value={formGoalCurrent}
                    onChange={(e) => setFormGoalCurrent(formatRupiahInput(e.target.value))}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Tenggat Waktu / Deadline</label>
                  <div className={styles.deadlineRow}>
                    <SelectDropdown
                      fullWidth
                      value={formGoalMonth}
                      onChange={(val) => setFormGoalMonth(val)}
                      options={[
                        { value: 'Januari', label: 'Januari' },
                        { value: 'Februari', label: 'Februari' },
                        { value: 'Maret', label: 'Maret' },
                        { value: 'April', label: 'April' },
                        { value: 'Mei', label: 'Mei' },
                        { value: 'Juni', label: 'Juni' },
                        { value: 'Juli', label: 'Juli' },
                        { value: 'Agustus', label: 'Agustus' },
                        { value: 'September', label: 'September' },
                        { value: 'Oktober', label: 'Oktober' },
                        { value: 'November', label: 'November' },
                        { value: 'Desember', label: 'Desember' },
                      ]}
                    />
                    <SelectDropdown
                      fullWidth
                      value={formGoalYear}
                      onChange={(val) => setFormGoalYear(val)}
                      options={[
                        { value: '2026', label: '2026' },
                        { value: '2027', label: '2027' },
                        { value: '2028', label: '2028' },
                        { value: '2029', label: '2029' },
                        { value: '2030', label: '2030' },
                      ]}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <Button variant="ghost" size="md" type="button" onClick={() => setActiveModal(null)}>
                    Batal
                  </Button>
                  <Button variant="primary" size="md" type="submit">
                    Simpan Target
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeModal === 'deleteConfirm' && deleteTarget && (
          <motion.div
            className={styles.modalOverlay}
            onClick={() => setActiveModal(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={cn(styles.modalCard, styles.confirmModalCard)}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className={styles.warningIconCircle}>
                <AlertTriangle size={26} />
              </div>

              <h3 className={styles.confirmTitle}>Konfirmasi Hapus</h3>
              <p className={styles.confirmDesc}>
                Apakah Anda yakin ingin menghapus {deleteTarget.type === 'budget' ? 'anggaran' : 'target'} "{deleteTarget.name}"?
                Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className={styles.confirmActions}>
                <Button variant="ghost" size="md" onClick={() => setActiveModal(null)}>
                  Batal
                </Button>
                <Button variant="danger" size="md" onClick={handleConfirmDelete}>
                  Ya, Hapus
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className={styles.toastPill}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          >
            <Check size={16} color="var(--color-primary)" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
