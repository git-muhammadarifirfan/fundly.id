// ============================================
// Fundly.id - Budget & Target Page (Full CRUD terhubung Supabase)
// ============================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Target,
  PieChart,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber/AnimatedNumber';
import { SelectDropdown } from '../../components/ui/SelectDropdown/SelectDropdown';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { DataError } from '../../components/ui/DataError/DataError';
import { formatCurrency, formatRupiahInput, parseCurrencyInput } from '../../utils/formatCurrency';
import { budgetHealth, formatDeadline, goalProjection, spentForBudget } from '../../utils/finance';
import { formatMonthYear, toISODate } from '../../utils/formatDate';
import { COLOR_OPTIONS, DynamicIcon, getIcon, readableIconColor } from '../../utils/icons';
import { cn } from '../../utils/cn';
import { MONTHS } from '../../config/constants';
import { ROUTES } from '../../config/routes';
import { useFinanceStore } from '../../stores/financeStore';
import { useCategoryMap, useCategoriesByType, useFinanceStatus } from '../../hooks/useFinance';
import type { Budget, Goal } from '../../types/models';
import styles from './BudgetPage.module.css';

type BudgetFilter = 'all' | 'warning' | 'safe';
type ModalKind = 'addBudget' | 'editBudget' | 'addGoal' | 'editGoal' | 'deleteConfirm' | null;

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i), label: m }));

export const BudgetPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading, isError, error, reload } = useFinanceStatus();
  const allBudgets = useFinanceStore((s) => s.budgets);
  const transactions = useFinanceStore((s) => s.transactions);
  const goals = useFinanceStore((s) => s.goals);
  const saveBudget = useFinanceStore((s) => s.saveBudget);
  const deleteBudget = useFinanceStore((s) => s.deleteBudget);
  const copyBudgets = useFinanceStore((s) => s.copyBudgets);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const categoriesById = useCategoryMap();
  const expenseCategories = useCategoriesByType('expense');

  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [filter, setFilter] = useState<BudgetFilter>('all');

  // Modal State
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'budget' | 'goal'; id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Form State Budget
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formLimit, setFormLimit] = useState('');

  // Form State Goal
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formGoalName, setFormGoalName] = useState('');
  const [formGoalTarget, setFormGoalTarget] = useState('');
  const [formGoalCurrent, setFormGoalCurrent] = useState('');
  const [formGoalMonth, setFormGoalMonth] = useState('11');
  const [formGoalYear, setFormGoalYear] = useState(String(now.getFullYear() + 1));

  const containerRef = useRef<HTMLDivElement>(null);

  const isCurrentPeriod = period.month === now.getMonth() + 1 && period.year === now.getFullYear();
  const prevPeriod = period.month === 1 ? { month: 12, year: period.year - 1 } : { month: period.month - 1, year: period.year };

  // Budgets + realisasi pengeluaran untuk periode terpilih
  const budgets = useMemo(
    () =>
      allBudgets
        .filter((b) => b.month === period.month && b.year === period.year)
        .map((b) => {
          const cat = categoriesById.get(b.category_id);
          const spent = spentForBudget(transactions, b);
          return {
            ...b,
            name: cat?.name || 'Kategori dihapus',
            icon: cat?.icon || 'tag',
            color: cat?.color || '#AEAEB2',
            spent,
            health: budgetHealth(spent, b.amount_limit),
          };
        })
        .sort((a, b) => b.spent / b.amount_limit - a.spent / a.amount_limit),
    [allBudgets, transactions, categoriesById, period],
  );

  const prevBudgetCount = allBudgets.filter((b) => b.month === prevPeriod.month && b.year === prevPeriod.year).length;

  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalLimit = budgets.reduce((s, b) => s + b.amount_limit, 0);
  const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const warningCount = budgets.filter((b) => b.health !== 'safe').length;

  const filteredBudgets = budgets.filter((b) => {
    if (filter === 'warning') return b.health !== 'safe';
    if (filter === 'safe') return b.health === 'safe';
    return true;
  });

  // GSAP Progress Bar Animation
  const animKey = `${filter}-${period.month}-${period.year}-${budgets.length}-${isLoading}`;
  useEffect(() => {
    if (!containerRef.current) return;
    const bars = containerRef.current.querySelectorAll(`.${styles.progressFill}`);
    gsap.fromTo(
      bars,
      { width: '0%' },
      { width: (_, target) => (target as HTMLElement).dataset.width + '%', duration: 0.8, ease: 'power2.out', stagger: 0.08 },
    );
  }, [animKey]);

  // Pastikan lebar progress tetap akurat saat data realtime berubah
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll<HTMLElement>(`.${styles.progressFill}`).forEach((el) => {
      el.style.width = `${el.dataset.width}%`;
    });
  }, [budgets]);

  const shiftPeriod = (delta: number) => {
    setPeriod((p) => {
      const d = new Date(p.year, p.month - 1 + delta, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });
  };

  // ---- Budget modal ----
  const availableCategories = useMemo(() => {
    const used = new Set(budgets.map((b) => b.category_id));
    return expenseCategories.filter((c) => !used.has(c.id) || c.id === formCategory);
  }, [expenseCategories, budgets, formCategory]);

  const openAddBudgetModal = () => {
    const used = new Set(budgets.map((b) => b.category_id));
    const firstFree = expenseCategories.find((c) => !used.has(c.id));
    if (!firstFree) {
      toast.error(
        expenseCategories.length === 0
          ? 'Belum ada kategori pengeluaran. Tambahkan kategori di Pengaturan.'
          : 'Semua kategori pengeluaran sudah memiliki anggaran di bulan ini.',
      );
      return;
    }
    setEditingBudgetId(null);
    setFormCategory(firstFree.id);
    setFormLimit('');
    setActiveModal('addBudget');
  };

  const openEditBudgetModal = (item: Budget) => {
    setEditingBudgetId(item.id);
    setFormCategory(item.category_id);
    setFormLimit(formatRupiahInput(item.amount_limit));
    setActiveModal('editBudget');
  };

  // ---- Goal modal ----
  const openAddGoalModal = () => {
    setEditingGoalId(null);
    setFormGoalName('');
    setFormGoalTarget('');
    setFormGoalCurrent('');
    setFormGoalMonth('11');
    setFormGoalYear(String(now.getFullYear() + 1));
    setActiveModal('addGoal');
  };

  const openEditGoalModal = (item: Goal) => {
    setEditingGoalId(item.id);
    setFormGoalName(item.name);
    setFormGoalTarget(formatRupiahInput(item.target_amount));
    setFormGoalCurrent(item.current_amount ? formatRupiahInput(item.current_amount) : '');
    if (item.deadline) {
      setFormGoalMonth(String(Number(item.deadline.slice(5, 7)) - 1));
      setFormGoalYear(item.deadline.slice(0, 4));
    } else {
      setFormGoalMonth('11');
      setFormGoalYear(String(now.getFullYear() + 1));
    }
    setActiveModal('editGoal');
  };

  const openDeleteConfirm = (type: 'budget' | 'goal', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setActiveModal('deleteConfirm');
  };

  const closeModal = () => {
    if (!isSubmitting) setActiveModal(null);
  };

  // Handle Save Budget (Add / Edit)
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseCurrencyInput(formLimit);
    if (!formCategory) {
      toast.error('Pilih kategori anggaran.');
      return;
    }
    if (limitNum <= 0) {
      toast.error('Nominal limit harus angka yang valid & lebih besar dari 0!');
      return;
    }
    const catName = categoriesById.get(formCategory)?.name || 'kategori';
    if (activeModal === 'addBudget' && budgets.some((b) => b.category_id === formCategory)) {
      toast.error(`Anggaran untuk kategori ${catName} sudah ada di bulan ini!`);
      return;
    }

    setIsSubmitting(true);
    try {
      await saveBudget(
        { category_id: formCategory, amount_limit: limitNum, month: period.month, year: period.year },
        activeModal === 'editBudget' ? editingBudgetId : null,
      );
      toast.success(activeModal === 'addBudget' ? `Berhasil menambahkan anggaran ${catName}` : `Berhasil memperbarui anggaran ${catName}`);
      setActiveModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan anggaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Goal (Add / Edit)
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseCurrencyInput(formGoalTarget);
    const currentNum = parseCurrencyInput(formGoalCurrent);
    const name = formGoalName.trim();

    if (!name) {
      toast.error('Nama target tidak boleh kosong!');
      return;
    }
    if (targetNum <= 0) {
      toast.error('Nominal target harus lebih besar dari 0!');
      return;
    }
    const deadline = toISODate(new Date(Number(formGoalYear), Number(formGoalMonth) + 1, 0));

    setIsSubmitting(true);
    try {
      if (activeModal === 'addGoal') {
        await addGoal({
          name,
          target_amount: targetNum,
          current_amount: currentNum,
          deadline,
          icon: 'target',
          color: COLOR_OPTIONS[goals.length % COLOR_OPTIONS.length],
        });
        toast.success(`Berhasil membuat target ${name}`);
      } else if (editingGoalId) {
        await updateGoal(editingGoalId, { name, target_amount: targetNum, current_amount: currentNum, deadline });
        toast.success(`Berhasil memperbarui target ${name}`);
      }
      setActiveModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan target.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === 'budget') {
        await deleteBudget(deleteTarget.id);
        toast.success(`Anggaran "${deleteTarget.name}" berhasil dihapus`);
      } else {
        await deleteGoal(deleteTarget.id);
        toast.success(`Target "${deleteTarget.name}" berhasil dihapus`);
      }
      setActiveModal(null);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPrevious = async () => {
    setIsCopying(true);
    try {
      const count = await copyBudgets(prevPeriod, period);
      toast.success(count > 0 ? `${count} anggaran disalin dari ${formatMonthYear(prevPeriod.year, prevPeriod.month - 1)}` : 'Tidak ada anggaran baru untuk disalin');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyalin anggaran.');
    } finally {
      setIsCopying(false);
    }
  };

  const yearOptions = Array.from({ length: 16 }, (_, i) => {
    const y = String(now.getFullYear() + i - 1);
    return { value: y, label: y };
  });

  if (isError) return <DataError message={error} onRetry={() => void reload()} />;

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

      {/* Hero Overview Card */}
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div className={styles.heroBadge}>
            <div className={styles.heroBadgeIcon}>
              <PieChart size={15} />
            </div>
            <span>Overview Alokasi Anggaran</span>
          </div>
          <div className={styles.monthNav}>
            <button className={styles.monthNavBtn} onClick={() => shiftPeriod(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft size={14} />
            </button>
            <button
              className={styles.monthPill}
              onClick={() => setPeriod({ month: now.getMonth() + 1, year: now.getFullYear() })}
              title={isCurrentPeriod ? 'Bulan berjalan' : 'Kembali ke bulan ini'}
            >
              {formatMonthYear(period.year, period.month - 1)}
            </button>
            <button className={styles.monthNavBtn} onClick={() => shiftPeriod(1)} aria-label="Bulan berikutnya">
              <ChevronRight size={14} />
            </button>
          </div>
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

        <div className={styles.heroProgressBarTrack}>
          <div
            className={styles.heroProgressBarFill}
            style={{
              width: `${Math.min(totalPct, 100)}%`,
              background: totalPct > 100 ? 'var(--color-danger)' : totalPct >= 80 ? 'var(--color-warning)' : undefined,
            }}
          />
        </div>
      </div>

      {/* SECTION 1: ANGGARAN BULANAN */}
      <div className={styles.sectionTitleRow}>
        <div className={styles.sectionHeaderTitle}>
          <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
          <h2>Alokasi Anggaran Bulanan</h2>
          <span className={styles.periodPill}>Per Bulan</span>
        </div>
        <div className={styles.filterTabs}>
          <button className={cn(styles.filterTab, filter === 'all' && styles.filterActive)} onClick={() => setFilter('all')}>
            Semua ({budgets.length})
          </button>
          <button className={cn(styles.filterTab, filter === 'warning' && styles.filterActive)} onClick={() => setFilter('warning')}>
            <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
            Batas Limit{warningCount ? ` (${warningCount})` : ''}
          </button>
          <button className={cn(styles.filterTab, filter === 'safe' && styles.filterActive)} onClick={() => setFilter('safe')}>
            <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
            Aman
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.budgetGrid}>
          <Skeleton height="160px" borderRadius="20px" />
          <Skeleton height="160px" borderRadius="20px" />
          <Skeleton height="160px" borderRadius="20px" />
        </div>
      ) : budgets.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            icon={Wallet}
            title={`Belum Ada Anggaran ${formatMonthYear(period.year, period.month - 1)}`}
            description="Atur batas pengeluaran bulanan per kategori untuk menjaga kontrol keuangan Anda."
            actionLabel="Tambah Anggaran"
            actionIcon={<Plus size={16} />}
            onAction={openAddBudgetModal}
          />
          {prevBudgetCount > 0 && (
            <Button variant="outline" size="md" icon={<Copy size={15} />} loading={isCopying} onClick={() => void handleCopyPrevious()}>
              Salin {prevBudgetCount} anggaran dari {formatMonthYear(prevPeriod.year, prevPeriod.month - 1)}
            </Button>
          )}
        </div>
      ) : filteredBudgets.length === 0 ? (
        <EmptyState
          icon={filter === 'warning' ? CheckCircle2 : AlertCircle}
          title={filter === 'warning' ? 'Semua Anggaran Aman' : 'Tidak Ada Anggaran Aman'}
          description={
            filter === 'warning'
              ? 'Belum ada kategori yang mendekati atau melewati batas limit bulan ini.'
              : 'Semua anggaran sudah mendekati atau melewati batas limit.'
          }
        />
      ) : (
        <div className={styles.budgetGrid}>
          {filteredBudgets.map((item) => {
            const IconComp = getIcon(item.icon);
            const pct = item.amount_limit > 0 ? Math.round((item.spent / item.amount_limit) * 100) : 0;
            const isOver = item.health === 'over';
            const isWarning = item.health === 'warning';

            return (
              <motion.div
                key={item.id}
                className={cn(styles.budgetCard, isOver && styles.cardOver, isWarning && styles.cardWarning)}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardTopLeft}>
                    <div className={styles.cardIconBox} style={{ background: `${item.color}1F`, color: readableIconColor(item.color) }}>
                      <IconComp size={20} />
                    </div>
                    <div className={styles.cardHeaderInfo}>
                      <h3 className={styles.cardTitle}>{item.name}</h3>
                      <span className={cn(styles.statusBadge, isOver ? styles.statusOver : isWarning ? styles.statusWarning : styles.statusSafe)}>
                        {isOver ? 'Kelebihan' : isWarning ? 'Waspada' : 'Aman'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardActionBtns}>
                    <button className={styles.iconBtn} onClick={() => openEditBudgetModal(item)} title="Edit Anggaran">
                      <Edit2 size={14} />
                    </button>
                    <button
                      className={cn(styles.iconBtn, styles.iconBtnDanger)}
                      onClick={() => openDeleteConfirm('budget', item.id, item.name)}
                      title="Hapus Anggaran"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div
                  className={styles.cardMiddle}
                  role="button"
                  style={{ cursor: 'pointer' }}
                  title="Lihat transaksi kategori ini"
                  onClick={() => {
                    const from = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
                    const to = toISODate(new Date(period.year, period.month, 0));
                    navigate(`${ROUTES.TRANSACTIONS}?category=${item.category_id}&type=expense&from=${from}&to=${to}`);
                  }}
                >
                  <div className={styles.amountDisplay}>
                    <AnimatedNumber value={item.spent} className={styles.spentAmount} />
                    <span className={styles.limitAmount}>dari {formatCurrency(item.amount_limit)}</span>
                  </div>
                  <span className={styles.pctBadge}>{pct}%</span>
                </div>

                <div className={styles.progressTrack}>
                  <div
                    className={cn(styles.progressFill, isOver && styles.fillOver, isWarning && styles.fillWarning)}
                    data-width={Math.min(pct, 100)}
                    style={{ background: isOver ? 'var(--color-danger)' : isWarning ? 'var(--color-warning)' : item.color }}
                  />
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.remainingText}>
                    {isOver
                      ? `Kelebihan ${formatCurrency(item.spent - item.amount_limit)}`
                      : `Sisa anggaran ${formatCurrency(item.amount_limit - item.spent)}`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* SECTION 2: TARGET FINANSIAL (GOALS) */}
      <div className={styles.sectionTitleRow} style={{ marginTop: 'var(--space-6)' }}>
        <div className={styles.sectionHeaderTitle}>
          <Target size={20} style={{ color: 'var(--color-primary)' }} />
          <h2>Target Tabungan & Impian (Goals)</h2>
        </div>
        {goals.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.GOALS)}>
            Kelola Dana Target <ChevronRight size={14} />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.goalsGrid}>
          <Skeleton height="150px" borderRadius="20px" />
          <Skeleton height="150px" borderRadius="20px" />
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum Ada Target Tabungan"
          description="Buat target untuk dana darurat, liburan, gadget, atau impian lainnya dan pantau progresnya."
          actionLabel="Tambah Target"
          actionIcon={<Plus size={16} />}
          onAction={openAddGoalModal}
        />
      ) : (
        <div className={styles.goalsGrid}>
          {goals.map((goal) => {
            const proj = goalProjection(goal);
            return (
              <motion.div key={goal.id} className={styles.goalCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className={styles.goalCardTop}>
                  <div className={styles.goalIconCircle} style={{ background: `${goal.color}20`, color: readableIconColor(goal.color) }}>
                    <DynamicIcon name={goal.icon} size={22} fallback={Target} />
                  </div>
                  <div className={styles.cardActionBtns}>
                    <button className={styles.iconBtn} onClick={() => openEditGoalModal(goal)} title="Edit Target">
                      <Edit2 size={14} />
                    </button>
                    <button
                      className={cn(styles.iconBtn, styles.iconBtnDanger)}
                      onClick={() => openDeleteConfirm('goal', goal.id, goal.name)}
                      title="Hapus Target"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className={styles.goalCardTitle}>{goal.name}</h3>
                <p className={styles.goalDeadlineText}>
                  {proj.achieved ? 'Target tercapai 🎉' : `Target s/d ${formatDeadline(goal.deadline)}`}
                </p>

                <div className={styles.goalAmountRow}>
                  <AnimatedNumber value={goal.current_amount} className={styles.goalCurrentVal} />
                  <span className={styles.goalTargetVal}>/ {formatCurrency(goal.target_amount)}</span>
                </div>

                <div className={styles.goalTrack}>
                  <div className={styles.goalFill} style={{ width: `${proj.percentage}%`, background: goal.color }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT BUDGET */}
      <AnimatePresence>
        {(activeModal === 'addBudget' || activeModal === 'editBudget') && (
          <motion.div className={styles.modalOverlay} onClick={closeModal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                <button className={styles.closeBtn} onClick={closeModal} aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBudget} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Kategori Pengeluaran</label>
                  <SelectDropdown
                    fullWidth
                    value={formCategory}
                    onChange={(val) => setFormCategory(val)}
                    options={availableCategories.map((c) => ({ value: c.id, label: c.name, icon: getIcon(c.icon) }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Batas Limit Anggaran {formatMonthYear(period.year, period.month - 1)} (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Contoh: 5.000.000"
                    value={formLimit}
                    onChange={(e) => setFormLimit(formatRupiahInput(e.target.value))}
                    className={styles.formInput}
                    autoFocus
                  />
                </div>

                <div className={styles.modalFooter}>
                  <Button variant="ghost" size="md" type="button" onClick={closeModal} disabled={isSubmitting}>
                    Batal
                  </Button>
                  <Button variant="primary" size="md" type="submit" loading={isSubmitting}>
                    Simpan Anggaran
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD / EDIT GOAL */}
      <AnimatePresence>
        {(activeModal === 'addGoal' || activeModal === 'editGoal') && (
          <motion.div className={styles.modalOverlay} onClick={closeModal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                <button className={styles.closeBtn} onClick={closeModal} aria-label="Tutup">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Nama Target</label>
                  <input
                    type="text"
                    placeholder="Misal: Beli Mobil Impian"
                    value={formGoalName}
                    maxLength={60}
                    onChange={(e) => setFormGoalName(e.target.value)}
                    className={styles.formInput}
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Target Nominal (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
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
                    inputMode="numeric"
                    placeholder="Contoh: 45.000.000"
                    value={formGoalCurrent}
                    onChange={(e) => setFormGoalCurrent(formatRupiahInput(e.target.value))}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Tenggat Waktu / Deadline</label>
                  <div className={styles.deadlineRow}>
                    <SelectDropdown fullWidth value={formGoalMonth} onChange={setFormGoalMonth} options={MONTH_OPTIONS} />
                    <SelectDropdown fullWidth value={formGoalYear} onChange={setFormGoalYear} options={yearOptions} />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <Button variant="ghost" size="md" type="button" onClick={closeModal} disabled={isSubmitting}>
                    Batal
                  </Button>
                  <Button variant="primary" size="md" type="submit" loading={isSubmitting}>
                    Simpan Target
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: DELETE CONFIRMATION */}
      <AnimatePresence>
        {activeModal === 'deleteConfirm' && deleteTarget && (
          <motion.div className={styles.modalOverlay} onClick={closeModal} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                <Button variant="ghost" size="md" onClick={closeModal} disabled={isSubmitting}>
                  Batal
                </Button>
                <Button variant="danger" size="md" onClick={() => void handleConfirmDelete()} loading={isSubmitting}>
                  Ya, Hapus
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
