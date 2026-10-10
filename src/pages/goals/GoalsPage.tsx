// ============================================
// Fundly.id — Goals Page (Target Tabungan)
// ============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';
import { CheckCircle2, TrendingUp, Calendar, Target, Plus, Pencil, Trash2, PiggyBank, Minus } from 'lucide-react';
import { useCountUp } from '../../hooks/useAnimations';
import { useFinanceStatus } from '../../hooks/useFinance';
import { useFinanceStore } from '../../stores/financeStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDeadline, goalProjection } from '../../utils/finance';
import { toISODate } from '../../utils/formatDate';
import { COLOR_OPTIONS, DynamicIcon, GOAL_ICON_OPTIONS, readableIconColor } from '../../utils/icons';
import { MONTHS } from '../../config/constants';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog';
import { SelectDropdown } from '../../components/ui/SelectDropdown/SelectDropdown';
import { Field, MoneyInput, IconPicker, ColorPicker, ItemPreview, Segmented, formStyles } from '../../components/ui/Form/Form';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { DataError } from '../../components/ui/DataError/DataError';
import type { Goal } from '../../types/models';
import styles from './GoalsPage.module.css';

const GOAL_CATEGORIES = [
  'Tabungan & Keamanan',
  'Pendidikan',
  'Properti & Rumah',
  'Kendaraan',
  'Liburan & Travel',
  'Gadget & Elektronik',
  'Pensiun & Masa Depan',
  'Pernikahan & Keluarga',
  'Lainnya',
];

interface GoalForm {
  name: string;
  category: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  hasDeadline: boolean;
  month: string;
  year: string;
}

export const GoalsPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoading, isError, error, reload } = useFinanceStatus();
  const goals = useFinanceStore((s) => s.goals);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const adjustGoal = useFinanceStore((s) => s.adjustGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);

  const now = new Date();
  const defaultForm = (): GoalForm => ({
    name: '',
    category: GOAL_CATEGORIES[0],
    icon: 'target',
    color: COLOR_OPTIONS[goals.length % COLOR_OPTIONS.length],
    target: 0,
    current: 0,
    hasDeadline: true,
    month: '11',
    year: String(now.getFullYear() + 1),
  });

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(defaultForm);
  const [fundGoal, setFundGoal] = useState<Goal | null>(null);
  const [fundMode, setFundMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [fundAmount, setFundAmount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Summary Metrics
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalCurrent = goals.reduce((acc, g) => acc + Math.min(g.current_amount, g.target_amount), 0);
  const overallPercentage = totalTarget > 0 ? Math.floor((totalCurrent / totalTarget) * 100) : 0;
  const achievedCount = goals.filter((g) => g.current_amount >= g.target_amount).length;

  const totalCurrentRef = useCountUp(totalCurrent, 1.2, 0.2);

  const sortedGoals = useMemo(
    () =>
      goals.slice().sort((a, b) => {
        const aDone = a.current_amount >= a.target_amount ? 1 : 0;
        const bDone = b.current_amount >= b.target_amount ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return (a.deadline || '9999').localeCompare(b.deadline || '9999');
      }),
    [goals],
  );

  // GSAP animation saat daftar target berubah jumlahnya
  useEffect(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll(`.${styles.goalCard}`);
    const bars = containerRef.current.querySelectorAll(`.${styles.progressBarFill}`);
    gsap.fromTo(cards, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'opacity,transform' });
    gsap.fromTo(
      bars,
      { width: '0%' },
      { width: (_, target) => (target as HTMLElement).dataset.width + '%', duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.2 },
    );
  }, [goals.length, isLoading]);

  useEffect(() => {
    containerRef.current?.querySelectorAll<HTMLElement>(`.${styles.progressBarFill}`).forEach((el) => {
      el.style.width = `${el.dataset.width}%`;
    });
  }, [goals]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setFormMode('create');
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setForm({
      name: goal.name,
      category: goal.category || GOAL_CATEGORIES[0],
      icon: goal.icon,
      color: goal.color,
      target: goal.target_amount,
      current: goal.current_amount,
      hasDeadline: Boolean(goal.deadline),
      month: goal.deadline ? String(Number(goal.deadline.slice(5, 7)) - 1) : '11',
      year: goal.deadline ? goal.deadline.slice(0, 4) : String(now.getFullYear() + 1),
    });
    setFormMode('edit');
  };

  const openFund = (goal: Goal, mode: 'deposit' | 'withdraw' = 'deposit') => {
    setFundGoal(goal);
    setFundMode(mode);
    setFundAmount(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error('Nama target tidak boleh kosong!');
      return;
    }
    if (form.target <= 0) {
      toast.error('Nominal target harus lebih besar dari 0!');
      return;
    }
    const deadline = form.hasDeadline ? toISODate(new Date(Number(form.year), Number(form.month) + 1, 0)) : null;
    const payload = {
      name,
      category: form.category,
      icon: form.icon,
      color: form.color,
      target_amount: form.target,
      current_amount: form.current,
      deadline,
    };

    setIsSaving(true);
    try {
      if (formMode === 'create') {
        await addGoal(payload);
        toast.success(`Target "${name}" berhasil dibuat`);
      } else if (editing) {
        await updateGoal(editing.id, payload);
        toast.success(`Target "${name}" berhasil diperbarui`);
      }
      setFormMode(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan target.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundGoal) return;
    if (fundAmount <= 0) {
      toast.error('Masukkan nominal yang valid.');
      return;
    }
    if (fundMode === 'withdraw' && fundAmount > fundGoal.current_amount) {
      toast.error(`Dana terkumpul hanya ${formatCurrency(fundGoal.current_amount)}.`);
      return;
    }
    setIsSaving(true);
    try {
      const updated = await adjustGoal(fundGoal.id, fundMode === 'deposit' ? fundAmount : -fundAmount);
      if (fundMode === 'deposit' && updated.current_amount >= updated.target_amount && fundGoal.current_amount < fundGoal.target_amount) {
        toast.success(`Selamat! Target "${updated.name}" tercapai 🎉`);
      } else {
        toast.success(
          fundMode === 'deposit'
            ? `${formatCurrency(fundAmount)} ditambahkan ke "${updated.name}"`
            : `${formatCurrency(fundAmount)} ditarik dari "${updated.name}"`,
        );
      }
      setFundGoal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui dana target.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteGoal(deleteTarget.id);
      toast.success(`Target "${deleteTarget.name}" dihapus`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus target.');
    } finally {
      setIsSaving(false);
    }
  };

  const yearOptions = Array.from({ length: 31 }, (_, i) => {
    const y = String(now.getFullYear() + i - 1);
    return { value: y, label: y };
  });

  if (isError) return <DataError message={error} onRetry={() => void reload()} />;

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Top Header Summary Card */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryLeft}>
          <div className={styles.summaryBadge}>
            <TrendingUp size={16} /> Ringkasan Target Impian
          </div>
          <h2 className={styles.summaryTitle}>
            Rp. <span ref={totalCurrentRef as React.RefObject<HTMLSpanElement>}>0</span>{' '}
            <span className={styles.summaryTargetText}>/ {formatCurrency(totalTarget)}</span>
          </h2>
          <p className={styles.summaryDesc}>
            {goals.length === 0 ? (
              'Mulai buat target tabungan untuk impian finansial Anda.'
            ) : (
              <>
                Akumulasi pencapaian {goals.length} target Anda telah mencapai <strong>{overallPercentage}%</strong>
                {achievedCount > 0 && ` · ${achievedCount} target tercapai`}.
              </>
            )}
          </p>
        </div>
        <div className={styles.summaryRight}>
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openCreate}>
            Tambah Target
          </Button>
        </div>
      </div>

      {/* Grid of Goals */}
      {isLoading ? (
        <div className={styles.goalsGrid}>
          <Skeleton height="200px" borderRadius="20px" />
          <Skeleton height="200px" borderRadius="20px" />
          <Skeleton height="200px" borderRadius="20px" />
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum Ada Target Impian"
          description="Tentukan target tabungan untuk impian finansial Anda seperti dana darurat, gadget, atau properti."
          actionLabel="Buat Target Pertama"
          actionIcon={<Plus size={16} />}
          onAction={openCreate}
        />
      ) : (
        <div className={styles.goalsGrid}>
          {sortedGoals.map((goal) => {
            const proj = goalProjection(goal);
            const iconColor = readableIconColor(goal.color);

            return (
              <div key={goal.id} className={styles.goalCard}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.iconCategoryGroup}>
                    <div className={styles.goalIconCircle} style={{ backgroundColor: `${goal.color}20`, color: iconColor }}>
                      <DynamicIcon name={goal.icon} size={22} fallback={Target} />
                    </div>
                    <div>
                      <h3 className={styles.goalTitle}>{goal.name}</h3>
                      <span className={styles.categoryBadge}>{goal.category}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.deleteGoalBtn} onClick={() => openEdit(goal)} aria-label="Edit target" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button
                      className={styles.deleteGoalBtn}
                      onClick={() => setDeleteTarget(goal)}
                      aria-label="Hapus target"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Progress Section */}
                <div className={styles.progressSection}>
                  <div className={styles.progressMetaRow}>
                    <span className={styles.currentAmountText}>{formatCurrency(goal.current_amount)}</span>
                    <span className={styles.pctBadge} style={{ backgroundColor: `${goal.color}20`, color: iconColor }}>
                      {proj.percentage}%
                    </span>
                  </div>

                  <div className={styles.progressBarTrack}>
                    <div className={styles.progressBarFill} data-width={proj.percentage} style={{ backgroundColor: goal.color }} />
                  </div>

                  <div className={styles.targetAndDeadlineRow}>
                    <span className={styles.targetText}>Target: {formatCurrency(goal.target_amount)}</span>
                    <span className={styles.deadlineText} style={proj.overdue ? { color: 'var(--color-danger)' } : undefined}>
                      <Calendar size={12} /> {formatDeadline(goal.deadline)}
                    </span>
                  </div>
                  {!proj.achieved && proj.monthlyNeeded !== null && (
                    <span className={styles.projectionText}>
                      {proj.overdue
                        ? 'Tenggat terlewati — perbarui tenggat atau tambah dana.'
                        : `Sisihkan ±${formatCurrency(proj.monthlyNeeded)}/bulan agar tercapai tepat waktu.`}
                    </span>
                  )}
                </div>

                {/* Card Footer */}
                <div className={styles.cardFooter}>
                  {proj.achieved ? (
                    <div className={styles.achievedBadge}>
                      <CheckCircle2 size={16} /> Impian Terpenuhi!
                    </div>
                  ) : (
                    <span className={styles.remainingText}>Sisa Target: {formatCurrency(proj.remaining)}</span>
                  )}
                  <div className={styles.footerActions}>
                    {goal.current_amount > 0 && (
                      <button className={styles.addMoneyBtn} onClick={() => openFund(goal, 'withdraw')} title="Tarik dana">
                        <Minus size={14} />
                      </button>
                    )}
                    <button className={styles.addMoneyBtn} onClick={() => openFund(goal, 'deposit')}>
                      <PiggyBank size={14} /> Tambah Dana
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <Modal
        isOpen={formMode !== null}
        onClose={() => !isSaving && setFormMode(null)}
        size="sm"
        title={formMode === 'create' ? 'Tambah Target Baru' : 'Edit Target'}
      >
        <form className={formStyles.form} onSubmit={handleSubmit}>
          <ItemPreview icon={form.icon} color={form.color} title={form.name} subtitle={form.category} />

          <Field label="Nama Target" htmlFor="goal-name">
            <input
              id="goal-name"
              className={formStyles.input}
              placeholder="Misal: Dana Darurat 6 Bulan"
              value={form.name}
              maxLength={60}
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Kategori">
            <SelectDropdown
              fullWidth
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
              options={GOAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </Field>

          <div className={`${formStyles.row} ${formStyles.rowStackMobile}`}>
            <Field label="Target Nominal">
              <MoneyInput value={form.target} onChange={(target) => setForm({ ...form, target })} />
            </Field>
            <Field label="Sudah Terkumpul">
              <MoneyInput value={form.current} onChange={(current) => setForm({ ...form, current })} />
            </Field>
          </div>

          <Field label="Tenggat Waktu">
            <Segmented
              options={[
                { value: 'yes', label: 'Ada Tenggat' },
                { value: 'no', label: 'Tanpa Tenggat' },
              ]}
              value={form.hasDeadline ? 'yes' : 'no'}
              onChange={(v) => setForm({ ...form, hasDeadline: v === 'yes' })}
            />
          </Field>
          {form.hasDeadline && (
            <div className={formStyles.row}>
              <SelectDropdown
                fullWidth
                value={form.month}
                onChange={(month) => setForm({ ...form, month })}
                options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
              />
              <SelectDropdown fullWidth value={form.year} onChange={(year) => setForm({ ...form, year })} options={yearOptions} />
            </div>
          )}

          <Field label="Ikon">
            <IconPicker icons={GOAL_ICON_OPTIONS} value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
          </Field>
          <Field label="Warna">
            <ColorPicker colors={COLOR_OPTIONS} value={form.color} onChange={(color) => setForm({ ...form, color })} />
          </Field>

          <div className={formStyles.actions}>
            <Button variant="ghost" size="md" type="button" onClick={() => setFormMode(null)} disabled={isSaving}>
              Batal
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSaving}>
              Simpan Target
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deposit / Withdraw Modal */}
      <Modal
        isOpen={Boolean(fundGoal)}
        onClose={() => !isSaving && setFundGoal(null)}
        size="sm"
        title={fundGoal ? `Dana Target: ${fundGoal.name}` : ''}
      >
        {fundGoal && (
          <form className={formStyles.form} onSubmit={handleFund}>
            <Segmented<'deposit' | 'withdraw'>
              options={[
                { value: 'deposit', label: 'Tambah Dana' },
                { value: 'withdraw', label: 'Tarik Dana' },
              ]}
              value={fundMode}
              onChange={setFundMode}
              accent
            />
            <Field
              label={fundMode === 'deposit' ? 'Nominal yang Ditabung' : 'Nominal yang Ditarik'}
              hint={`Terkumpul ${formatCurrency(fundGoal.current_amount)} dari ${formatCurrency(fundGoal.target_amount)}`}
            >
              <MoneyInput value={fundAmount} onChange={setFundAmount} autoFocus />
            </Field>
            {fundMode === 'deposit' && fundGoal.target_amount > fundGoal.current_amount && (
              <div className={formStyles.chipRow}>
                <button
                  type="button"
                  className={formStyles.chip}
                  onClick={() => setFundAmount(fundGoal.target_amount - fundGoal.current_amount)}
                >
                  Lunasi sisa ({formatCurrency(fundGoal.target_amount - fundGoal.current_amount, { compact: true })})
                </button>
                {[100_000, 500_000, 1_000_000].map((v) => (
                  <button key={v} type="button" className={formStyles.chip} onClick={() => setFundAmount(fundAmount + v)}>
                    +{formatCurrency(v, { compact: true })}
                  </button>
                ))}
              </div>
            )}
            <div className={formStyles.actions}>
              <Button variant="ghost" size="md" type="button" onClick={() => setFundGoal(null)} disabled={isSaving}>
                Batal
              </Button>
              <Button variant="primary" size="md" type="submit" loading={isSaving}>
                {fundMode === 'deposit' ? 'Tambah Dana' : 'Tarik Dana'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Hapus Target?"
        description={
          deleteTarget ? (
            <>
              Target <strong>{deleteTarget.name}</strong> beserta progres dananya akan dihapus permanen.
            </>
          ) : null
        }
        confirmLabel="Ya, Hapus"
        loading={isSaving}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
