// ============================================
// Fundly.id - Accounts Page (Akun & Dompet)
// ============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Wallet,
  Plus,
  MoreHorizontal,
  Pencil,
  ListFilter,
  ArrowLeftRight,
  Archive,
  ArchiveRestore,
  ChevronLeft,
} from 'lucide-react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { DataError } from '../../components/ui/DataError/DataError';
import { Field, MoneyInput, IconPicker, ColorPicker, ItemPreview, formStyles } from '../../components/ui/Form/Form';
import { useFinanceStore } from '../../stores/financeStore';
import { useFinanceStatus } from '../../hooks/useFinance';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { formatCurrency } from '../../utils/formatCurrency';
import { totalBalance } from '../../utils/finance';
import {
  ACCOUNT_ICON_OPTIONS,
  ACCOUNT_TYPE_LABELS,
  COLOR_OPTIONS,
  DEFAULT_ACCOUNT_ICONS,
  DynamicIcon,
} from '../../utils/icons';
import { cn } from '../../utils/cn';
import { ROUTES } from '../../config/routes';
import type { AccountType } from '../../types/common';
import type { Account } from '../../types/models';
import styles from './AccountsPage.module.css';

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'ewallet', 'credit_card'];

interface AccountForm {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance: number; // nilai positif (untuk kartu kredit = jumlah tagihan)
}

const emptyForm: AccountForm = { name: '', type: 'bank', icon: 'landmark', color: '#45B7D1', balance: 0 };

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isLoading, isError, error, reload } = useFinanceStatus();
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.transactions);
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const setAccountActive = useFinanceStore((s) => s.setAccountActive);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [balanceTouched, setBalanceTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Account | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
  const archived = useMemo(() => accounts.filter((a) => !a.is_active), [accounts]);
  const total = totalBalance(accounts);

  const txCountByAccount = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      map.set(t.account_id, (map.get(t.account_id) || 0) + 1);
      if (t.to_account_id) map.set(t.to_account_id, (map.get(t.to_account_id) || 0) + 1);
    });
    return map;
  }, [transactions]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setBalanceTouched(false);
    setEditing(null);
    setModalMode('create');
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setForm({
      name: acc.name,
      type: acc.type,
      icon: acc.icon,
      color: acc.color,
      balance: Math.abs(acc.balance),
    });
    setBalanceTouched(false);
    setModalMode('edit');
    setMenuFor(null);
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalMode(null);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error('Nama akun wajib diisi.');
      return;
    }
    if (accounts.some((a) => a.name.toLowerCase() === name.toLowerCase() && a.id !== editing?.id)) {
      toast.error('Nama akun sudah digunakan. Gunakan nama lain.');
      return;
    }
    const signedBalance = form.type === 'credit_card' ? -Math.abs(form.balance) : form.balance;

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await addAccount({ name, type: form.type, icon: form.icon, color: form.color, balance: signedBalance });
        toast.success(`Akun "${name}" berhasil ditambahkan`);
      } else if (editing) {
        const patch: Parameters<typeof updateAccount>[1] = { name, type: form.type, icon: form.icon, color: form.color };
        // Saldo hanya diubah jika user benar-benar menyesuaikannya
        const adjustBalance = balanceTouched && signedBalance !== editing.balance;
        if (adjustBalance) patch.balance = signedBalance;
        await updateAccount(editing.id, patch);
        toast.success(adjustBalance ? `Akun "${name}" diperbarui & saldo disesuaikan` : `Akun "${name}" berhasil diperbarui`);
      }
      setModalMode(null);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan akun.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    if (active.length <= 1 && archiveTarget.is_active) {
      toast.error('Minimal harus ada satu akun aktif.');
      setArchiveTarget(null);
      return;
    }
    setIsArchiving(true);
    try {
      await setAccountActive(archiveTarget.id, false);
      toast.success(`Akun "${archiveTarget.name}" diarsipkan`);
      setArchiveTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengarsipkan akun.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (acc: Account) => {
    try {
      await setAccountActive(acc.id, true);
      toast.success(`Akun "${acc.name}" dipulihkan`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memulihkan akun.');
    }
  };

  if (isError) return <DataError message={error} onRetry={() => void reload()} />;

  const renderAccount = (acc: Account) => (
    <Card
      key={acc.id}
      padding="md"
      className={cn(styles.accountItem, !acc.is_active && styles.archivedItem)}
      style={{ position: 'relative', zIndex: menuFor === acc.id ? 5 : undefined }}
    >
      <div className={styles.accountIcon} style={{ background: `${acc.color}20`, color: acc.color }}>
        <DynamicIcon name={acc.icon} size={20} fallback={Wallet} />
      </div>
      <div className={styles.accountInfo}>
        <span className={styles.accountName}>{acc.name}</span>
        <span className={styles.accountType}>
          {ACCOUNT_TYPE_LABELS[acc.type]} · {txCountByAccount.get(acc.id) || 0} transaksi
        </span>
      </div>
      <span
        className={styles.accountBalance}
        style={{ color: acc.balance < 0 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}
      >
        {formatCurrency(acc.balance)}
      </span>
      {acc.is_active ? (
        <div className={styles.menuWrap} ref={menuFor === acc.id ? menuRef : undefined}>
          <button
            className={styles.moreBtn}
            aria-label={`Menu akun ${acc.name}`}
            onClick={() => setMenuFor(menuFor === acc.id ? null : acc.id)}
          >
            <MoreHorizontal size={16} />
          </button>
          <AnimatePresence>
            {menuFor === acc.id && (
              <motion.div
                className={styles.menu}
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14 }}
              >
                <button className={styles.menuItem} onClick={() => openEdit(acc)}>
                  <Pencil size={14} /> Edit & Sesuaikan Saldo
                </button>
                <button className={styles.menuItem} onClick={() => navigate(`${ROUTES.TRANSACTIONS}?account=${acc.id}`)}>
                  <ListFilter size={14} /> Lihat Transaksi
                </button>
                <button
                  className={styles.menuItem}
                  onClick={() => navigate(`${ROUTES.ADD_TRANSACTION}?type=transfer&account=${acc.id}`)}
                  disabled={active.length < 2}
                >
                  <ArrowLeftRight size={14} /> Transfer dari Akun Ini
                </button>
                <button
                  className={cn(styles.menuItem, styles.menuDanger)}
                  onClick={() => {
                    setArchiveTarget(acc);
                    setMenuFor(null);
                  }}
                >
                  <Archive size={14} /> Arsipkan
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <button className={styles.restoreBtn} onClick={() => void handleRestore(acc)}>
          <ArchiveRestore size={14} /> Pulihkan
        </button>
      )}
    </Card>
  );

  return (
    <div className={styles.page}>
      {isMobile && (
        <div className={styles.mobileHeader}>
          <button className={styles.backBtn} onClick={() => navigate(ROUTES.DASHBOARD)} aria-label="Kembali">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className={styles.mobileTitle}>Akun & Dompet</h1>
            <p className={styles.mobileSubtitle}>Kelola dompet, rekening & e-wallet</p>
          </div>
        </div>
      )}

      <Card variant="primary" padding="lg" className={styles.totalCard}>
        <div className={styles.totalHeader}>
          <Wallet size={24} />
          <span>Total Saldo</span>
        </div>
        <div className={styles.totalAmount}>{isLoading ? '…' : formatCurrency(total)}</div>
        <div className={styles.totalSub}>{active.length} akun aktif</div>
      </Card>

      <div className={styles.accountsList}>
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height="72px" borderRadius="16px" />)
        ) : active.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Belum Ada Akun"
            description="Tambahkan dompet tunai, rekening bank, e-wallet, atau kartu kredit untuk mulai mencatat."
            actionLabel="Tambah Akun"
            actionIcon={<Plus size={16} />}
            onAction={openCreate}
          />
        ) : (
          active.map(renderAccount)
        )}
      </div>

      <Button variant="outline" size="lg" fullWidth icon={<Plus size={18} />} className={styles.addBtn} onClick={openCreate}>
        Tambah Akun Baru
      </Button>

      {archived.length > 0 && (
        <div className={styles.archivedSection}>
          <button className={styles.archivedToggle} onClick={() => setShowArchived((v) => !v)}>
            <Archive size={14} /> {showArchived ? 'Sembunyikan' : 'Tampilkan'} akun diarsipkan ({archived.length})
          </button>
          {showArchived && <div className={styles.accountsList}>{archived.map(renderAccount)}</div>}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={modalMode !== null} onClose={closeModal} size="sm" title={modalMode === 'create' ? 'Tambah Akun Baru' : 'Edit Akun'}>
        <form className={formStyles.form} onSubmit={handleSubmit}>
          <ItemPreview
            icon={form.icon}
            color={form.color}
            title={form.name}
            subtitle={`${ACCOUNT_TYPE_LABELS[form.type]} · ${formatCurrency(
              editing && !balanceTouched ? editing.balance : form.type === 'credit_card' ? -form.balance : form.balance,
            )}`}
          />

          <Field label="Nama Akun" htmlFor="acc-name">
            <input
              id="acc-name"
              className={formStyles.input}
              placeholder="Misal: BCA, GoPay, Dompet"
              value={form.name}
              maxLength={40}
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Jenis Akun">
            <div className={formStyles.chipRow}>
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={cn(formStyles.chip, form.type === t && formStyles.chipActive)}
                  onClick={() =>
                    setForm({
                      ...form,
                      type: t,
                      icon: form.icon === DEFAULT_ACCOUNT_ICONS[form.type] ? DEFAULT_ACCOUNT_ICONS[t] : form.icon,
                    })
                  }
                >
                  {ACCOUNT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label={
              form.type === 'credit_card'
                ? modalMode === 'create'
                  ? 'Tagihan Awal (Utang)'
                  : 'Tagihan Saat Ini (Utang)'
                : modalMode === 'create'
                  ? 'Saldo Awal'
                  : 'Saldo Saat Ini'
            }
            hint={
              modalMode === 'edit'
                ? 'Ubah nilai ini hanya untuk menyesuaikan saldo dengan kondisi nyata. Saldo selanjutnya diperbarui otomatis dari transaksi.'
                : 'Saldo akan diperbarui otomatis setiap kali Anda mencatat transaksi.'
            }
          >
            <MoneyInput
              value={form.balance}
              onChange={(v) => {
                setBalanceTouched(true);
                setForm({ ...form, balance: v });
              }}
            />
          </Field>

          <Field label="Ikon">
            <IconPicker icons={ACCOUNT_ICON_OPTIONS} value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
          </Field>

          <Field label="Warna">
            <ColorPicker colors={COLOR_OPTIONS} value={form.color} onChange={(color) => setForm({ ...form, color })} />
          </Field>

          <div className={formStyles.actions}>
            <Button variant="ghost" size="md" type="button" onClick={closeModal} disabled={isSaving}>
              Batal
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSaving}>
              {modalMode === 'create' ? 'Tambah Akun' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        title="Arsipkan Akun?"
        description={
          archiveTarget ? (
            <>
              Akun <strong>{archiveTarget.name}</strong> akan disembunyikan dari pilihan transaksi dan tidak dihitung dalam total
              saldo. Riwayat transaksi tetap tersimpan dan akun dapat dipulihkan kapan saja.
            </>
          ) : null
        }
        confirmLabel="Ya, Arsipkan"
        loading={isArchiving}
        onConfirm={handleArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
};
