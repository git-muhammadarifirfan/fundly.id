// ============================================
// Fundly.id - Goals Page (Target Tabungan)
// Jumlah terkumpul = total saldo seluruh akun aktif (Tunai + Bank + E-Wallet), realtime.
// ============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';
import { CheckCircle2, Calendar, Target, Plus, Pencil, Trash2, Wallet, RefreshCw } from 'lucide-react';
import { useCountUp } from '../../hooks/useAnimations';
import { useFinanceStatus, useLiveGoals, useSavingsPool } from '../../hooks/useFinance';
import { useFinanceStore } from '../../stores/financeStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDeadline, goalProjection } from '../../utils/finance';
import { toISODate } from '../../utils/formatDate';
import { COLOR_OPTIONS, DynamicIcon, GOAL_ICON_OPTIONS, readableIconColor } from '../../utils/icons';
import { MONTHS } from '../../config/constants';
import { ROUTES } from '../../config/routes';
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
  hasDeadline: boolean;
  month: string;
  year: string;
}

export const GoalsPage: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoading, isError, error, reload } = useFinanceStatus();
  const goals = useLiveGoals();
  const pool = useSavingsPool();
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);

  const now = new Date();
  const defaultForm = (): GoalForm => ({
    name: '',
    category: GOAL_CATEGORIES[0],
    icon: 'target',
    color: COLOR_OPTIONS[goals.length % COLOR_OPTIONS.length],
    target: 0,
    hasDeadline: true,
    month: '11',
    year: String(now.getFullYear() + 1),
  });

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Ringkasan
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const achievedCount = goals.filter((g) => pool >= g.target_amount).length;
  const poolRef = useCountUp(pool, 1, 0.1);

  const sortedGoals = useMemo(
    () =>
      goals.slice().sort((a, b) => {
        const aDone = pool >= a.target_amount ? 1 : 0;
        const bDone = pool >= b.target_amount ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return (a.deadline || '9999').localeCompare(b.deadline || '9999');
      }),
    [goals, pool],
  );

  // Animasi masuk saat jumlah target berubah
  useEffect(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll(`.${styles.goalCard}`);
    gsap.fromTo(cards, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', clearProps: 'opacity,transform' });
  }, [goals.length, isLoading]);

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
      hasDeadline: Boolean(goal.deadline),
      month: goal.deadline ? String(Number(goal.deadline.slice(5, 7)) - 1) : '11',
      year: goal.deadline ? goal.deadline.slice(0, 4) : String(now.getFullYear() + 1),
    });
    setFormMode('edit');
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
      deadline,
    };

    setIsSaving(true);
    try {
      if (formMode === 'create') {
        await addGoal({ ...payload, current_amount: 0 });
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
      {/* Ringkasan: dana tersedia (realtime) */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryLeft}>
          <div className={styles.summaryBadge}>
            <RefreshCw size={14} /> Dana Tersedia · Realtime
          </div>
          <h2 className={styles.summaryTitle}>
            Rp <span ref={poolRef as React.RefObject<HTMLSpanElement>}>0</span>
          </h2>
          <p className={styles.summaryDesc}>
            {goals.length === 0
              ? 'Total saldo Tunai + Bank + E-Wallet Anda. Buat target untuk melihat progresnya.'
              : `Dari total target ${formatCurrency(totalTarget)} · ${goals.length} target${achievedCount ? ` · ${achievedCount} tercapai` : ''}`}
          </p>
        </div>
        <div className={styles.summaryRight}>
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openCreate}>
            Tambah Target
          </Button>
        </div>
      </div>

      <button type="button" className={styles.poolHint} onClick={() => navigate(ROUTES.ACCOUNTS)}>
        <Wallet size={14} />
        <span>Jumlah terkumpul dihitung otomatis dari total saldo semua akun. Ketuk untuk lihat akun.</span>
      </button>

      {/* Daftar target */}
      {isLoading ? (
        <div className={styles.goalsGrid}>
          <Skeleton height="170px" borderRadius="20px" />
          <Skeleton height="170px" borderRadius="20px" />
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum Ada Target Impian"
          description="Tentukan target tabungan seperti dana darurat, gadget, atau properti. Progresnya mengikuti total saldo Anda secara realtime."
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
                    <div className={styles.goalTitleCol}>
                      <h3 className={styles.goalTitle}>{goal.name}</h3>
                      <span className={styles.categoryBadge}>{goal.category}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.deleteGoalBtn} onClick={() => openEdit(goal)} aria-label="Edit target" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button className={styles.deleteGoalBtn} onClick={() => setDeleteTarget(goal)} aria-label="Hapus target" title="Hapus">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressMetaRow}>
                    <span className={styles.currentAmountText}>{formatCurrency(Math.min(goal.current_amount, goal.target_amount))}</span>
                    <span className={styles.pctBadge} style={{ backgroundColor: `${goal.color}20`, color: iconColor }}>
                      {proj.percentage}%
                    </span>
                  </div>

                  <div className={styles.progressBarTrack}>
                    <div className={styles.progressBarFill} style={{ width: `${proj.percentage}%`, backgroundColor: goal.color }} />
                  </div>

                  <div className={styles.targetAndDeadlineRow}>
                    <span className={styles.targetText}>Target {formatCurrency(goal.target_amount)}</span>
                    <span className={styles.deadlineText} style={proj.overdue ? { color: 'var(--color-danger)' } : undefined}>
                      <Calendar size={12} /> {formatDeadline(goal.deadline)}
                    </span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  {proj.achieved ? (
                    <div className={styles.achievedBadge}>
                      <CheckCircle2 size={16} /> Dana sudah cukup!
                    </div>
                  ) : (
                    <span className={styles.remainingText}>
                      Kurang {formatCurrency(proj.remaining)}
                      {proj.monthlyNeeded !== null && !proj.overdue && ` · ±${formatCurrency(proj.monthlyNeeded, { compact: true })}/bln`}
                      {proj.overdue && ' · tenggat terlewati'}
                    </span>
                  )}
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
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Target Nominal" hint={`Terkumpul otomatis dari total saldo: ${formatCurrency(pool)}`}>
            <MoneyInput value={form.target} onChange={(target) => setForm({ ...form, target })} />
          </Field>

          <Field label="Kategori">
            <SelectDropdown
              fullWidth
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
              options={GOAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </Field>

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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Hapus Target?"
        description={
          deleteTarget ? (
            <>
              Target <strong>{deleteTarget.name}</strong> akan dihapus. Saldo akun Anda tidak berubah.
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
