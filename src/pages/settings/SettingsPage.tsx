// ============================================
// Fundly.id - Settings Page (Profil, Keamanan, Kategori, Transaksi Rutin, Data)
// ============================================

import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Lock,
  LogOut,
  Camera,
  Edit3,
  KeyRound,
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertCircle,
  Tags,
  Repeat,
  Database,
  Plus,
  Pencil,
  Trash2,
  Pause,
  Play,
  Eye,
  EyeOff,
  RefreshCw,
  FileSpreadsheet,
  Sheet,
  Wallet,
  Vibrate,
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Field, IconPicker, ColorPicker, ItemPreview, Segmented, formStyles } from '../../components/ui/Form/Form';
import { isValidEmail, useAuthStore, validatePassword } from '../../stores/authStore';
import { useFinanceStore } from '../../stores/financeStore';
import { useAccountMap, useCategoryMap } from '../../hooks/useFinance';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { profileApi } from '../../services/financeApi';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatRelativeDate, getTodayISO } from '../../utils/formatDate';
import { CATEGORY_ICON_OPTIONS, COLOR_OPTIONS, DynamicIcon, readableIconColor } from '../../utils/icons';
import { categoryBreakdown, computeTotals } from '../../utils/finance';
import { exportReport } from '../../utils/exportReport';
import { isKeypadFeedbackEnabled, keypadFeedback, setKeypadFeedbackEnabled } from '../../utils/feedback';
import { compressImage } from '../../utils/image';
import { ROUTES } from '../../config/routes';
import type { CategoryType } from '../../types/common';
import type { Category, RecurringTemplate } from '../../types/models';
import styles from './SettingsPage.module.css';

type SettingsTab = 'profile' | 'password' | 'categories' | 'recurring' | 'data';

const TABS: { id: SettingsTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profil Saya', short: 'Profil', icon: User },
  { id: 'password', label: 'Keamanan', short: 'Keamanan', icon: Lock },
  { id: 'categories', label: 'Kategori', short: 'Kategori', icon: Tags },
  { id: 'recurring', label: 'Transaksi Rutin', short: 'Rutin', icon: Repeat },
  { id: 'data', label: 'Data & Ekspor', short: 'Data', icon: Database },
];

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'Setiap hari',
  weekly: 'Setiap minggu',
  monthly: 'Setiap bulan',
  yearly: 'Setiap tahun',
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // batas bucket Storage
const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // batas file asli sebelum dikompres

export const SettingsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user, logout, updateProfile, updateEmail, updatePassword, requestResetPassword } = useAuthStore();

  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const activeTab: SettingsTab = TABS.some((t) => t.id === tabParam) ? (tabParam as SettingsTab) : 'profile';
  const setActiveTab = (tab: SettingsTab) => setSearchParams(tab === 'profile' ? {} : { tab }, { replace: true });

  const email = user?.email || '';
  const isVerified = Boolean(user?.email_confirmed_at);
  const pendingEmail = (user as { new_email?: string } | null)?.new_email;
  const fullName = profile?.full_name || email.split('@')[0] || 'Pengguna';
  const avatarUrl = profile?.avatar_url || '';

  // ---- Profile state ----
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ---- Profile handlers ----
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error('Ukuran foto maksimal 15 MB.');
      return;
    }
    setIsUploading(true);
    try {
      // Perkecil ke 512px WebP di perangkat sebelum diunggah (hemat kuota & lebih cepat)
      const compressed = await compressImage(file, 512);
      if (compressed.size > MAX_AVATAR_BYTES) {
        toast.error('Foto terlalu besar. Gunakan foto lain (maks 2 MB setelah dikompres).');
        return;
      }
      const url = await profileApi.uploadAvatar(user.id, compressed);
      await updateProfile({ avatar_url: url });
      void profileApi.removeOldAvatars(user.id, url).catch(() => undefined);
      toast.success('Foto profil berhasil diperbarui!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah foto profil.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setIsUploading(true);
    try {
      await updateProfile({ avatar_url: null });
      void profileApi.removeOldAvatars(user.id, '__none__').catch(() => undefined);
      toast.success('Foto profil dihapus');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus foto profil.');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditName = () => {
    setNameDraft(fullName);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameDraft.trim();
    if (name.length < 2) {
      toast.error('Nama lengkap minimal 2 karakter.');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({ full_name: name });
      setIsEditingProfile(false);
      toast.success('Perubahan profil berhasil disimpan!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(newEmail)) {
      toast.error('Masukkan alamat email baru yang valid!');
      return;
    }
    if (newEmail.trim().toLowerCase() === email.toLowerCase()) {
      toast.error('Email baru tidak boleh sama dengan email saat ini!');
      return;
    }
    setIsSendingEmail(true);
    const { error } = await updateEmail(newEmail);
    setIsSendingEmail(false);
    if (error) {
      toast.error(error);
      return;
    }
    setShowEmailModal(false);
    toast.success(`Link verifikasi dikirim. Cek inbox ${newEmail} (dan email lama Anda) untuk konfirmasi.`, { duration: 6000 });
    setNewEmail('');
  };

  const handleConfirmResetPassword = async () => {
    setIsSendingReset(true);
    const { error } = await requestResetPassword(email);
    setIsSendingReset(false);
    if (error) {
      toast.error(error);
      return;
    }
    setShowResetPasswordModal(false);
    toast.success(`Tautan reset password telah dikirim ke ${email}`);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(newPassword);
    if (pwError) {
      toast.error(pwError);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok!');
      return;
    }
    setIsChangingPw(true);
    const { error } = await updatePassword(newPassword);
    setIsChangingPw(false);
    if (error) {
      toast.error(error);
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Kata sandi berhasil diperbarui!');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
    toast.success('Anda telah keluar dari sesi');
    navigate(ROUTES.LOGIN, { replace: true });
  };

  // ============================================
  // Sections
  // ============================================
  const profileSection = (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.profileSection}>
      {!isMobile && (
        <div className={styles.contentHeader}>
          <div>
            <h1 className={styles.sectionTitle}>Profil Saya</h1>
            <p className={styles.sectionSubtitle}>Informasi akun Anda</p>
          </div>
        </div>
      )}

      <motion.div layout className={styles.cardBox}>
        <div className={styles.avatarRow}>
          <div className={styles.avatarPreviewWrap}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto profil" className={styles.avatarImg} referrerPolicy="no-referrer" loading="lazy" decoding="async" />
            ) : (
              <div className={styles.avatarPlaceholderCircle}>
                <User size={32} />
              </div>
            )}
            {isUploading && (
              <div className={styles.avatarUploading}>
                <RefreshCw size={18} className={styles.spin} />
              </div>
            )}
            <button
              className={styles.avatarEditBadge}
              onClick={() => fileInputRef.current?.click()}
              title="Ganti Foto"
              disabled={isUploading}
            >
              <Camera size={13} />
            </button>
          </div>

          <div className={styles.avatarInfoCol}>
            <div className={styles.nameWithEditRow}>
              <h3 className={styles.profileDisplayName}>{fullName}</h3>
              <button type="button" className={styles.editPencilIconBtn} onClick={openEditName} title="Edit Nama">
                <Edit3 size={15} />
              </button>
            </div>

            <div className={styles.emailBadgeRow}>
              <span className={styles.profileDisplayEmail}>{email}</span>
              {isVerified ? (
                <span className={styles.verifiedBadge}>
                  <CheckCircle2 size={12} /> Terverifikasi
                </span>
              ) : (
                <span className={`${styles.verifiedBadge} ${styles.unverifiedBadge}`}>
                  <AlertCircle size={12} /> Belum verifikasi
                </span>
              )}
            </div>
            {avatarUrl && (
              <button type="button" className={styles.changeEmailLink} onClick={() => void handleRemoveAvatar()} disabled={isUploading}>
                Hapus foto
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => void handleImageUpload(e)}
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <motion.form layout onSubmit={(e) => e.preventDefault()} className={styles.profileForm}>
          <motion.div layout className={styles.formGroup}>
            <label>Nama Lengkap</label>
            <div className={styles.inputWithIcon}>
              <User size={16} className={styles.fieldIcon} />
              <input type="text" value={fullName} className={`${styles.formInput} ${styles.inputLocked}`} disabled />
            </div>
          </motion.div>

          <motion.div layout className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label>Alamat Email</label>
              <button type="button" className={styles.changeEmailLink} onClick={() => setShowEmailModal(true)}>
                Ubah Email
              </button>
            </div>
            <div className={styles.inputWithIcon}>
              <Mail size={16} className={styles.fieldIcon} />
              <input type="email" value={email} className={`${styles.formInput} ${styles.inputLocked}`} disabled />
            </div>
            {pendingEmail && (
              <span className={styles.pendingNote}>Menunggu konfirmasi perubahan ke {pendingEmail}</span>
            )}
          </motion.div>
          {user?.created_at && (
            <span className={styles.pendingNote}>Bergabung sejak {formatDate(user.created_at.slice(0, 10))}</span>
          )}
        </motion.form>

        {isMobile && (
          <motion.div layout className={styles.mobileLogoutCard}>
            <Button
              variant="outline"
              size="md"
              fullWidth
              icon={<LogOut size={16} />}
              onClick={() => setShowLogoutModal(true)}
              className={styles.mobileLogoutBtn}
            >
              Keluar Sesi Akun
            </Button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );

  const passwordSection = (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.profileSection}>
      {!isMobile && (
        <div className={styles.contentHeader}>
          <div>
            <h1 className={styles.sectionTitle}>Password & Keamanan</h1>
            <p className={styles.sectionSubtitle}>Kelola kata sandi akun Anda</p>
          </div>
        </div>
      )}

      <form className={styles.cardBox} onSubmit={handleChangePassword}>
        <div className={styles.cardHeader}>
          <Lock size={20} className={styles.cardHeaderIcon} />
          <h3>Ubah Kata Sandi</h3>
        </div>
        <p className={styles.passwordDescText}>Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.</p>
        <div className={styles.formGroup}>
          <label htmlFor="pw-new">Kata Sandi Baru</label>
          <div className={styles.inputWithIcon}>
            <Lock size={16} className={styles.fieldIcon} />
            <input
              id="pw-new"
              type={showPw ? 'text' : 'password'}
              className={styles.formInput}
              value={newPassword}
              autoComplete="new-password"
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="button" className={styles.inlineEyeBtn} onClick={() => setShowPw(!showPw)} aria-label="Tampilkan password">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="pw-confirm">Konfirmasi Kata Sandi Baru</label>
          <div className={styles.inputWithIcon}>
            <Lock size={16} className={styles.fieldIcon} />
            <input
              id="pw-confirm"
              type={showPw ? 'text' : 'password'}
              className={styles.formInput}
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.passwordActionRow}>
          <Button variant="primary" size="md" type="submit" loading={isChangingPw} icon={<KeyRound size={16} />} disabled={!newPassword}>
            Simpan Kata Sandi
          </Button>
        </div>
      </form>

      <div className={styles.cardBox}>
        <div className={styles.cardHeader}>
          <KeyRound size={20} className={styles.cardHeaderIcon} />
          <h3>Lupa Kata Sandi Lama?</h3>
        </div>
        <p className={styles.passwordDescText}>
          Tautan aman untuk mengatur ulang kata sandi akan dikirim ke alamat email terdaftar Anda (<strong>{email}</strong>).
        </p>
        <div className={styles.passwordActionRow}>
          <Button variant="outline" size="md" icon={<Send size={16} />} onClick={() => setShowResetPasswordModal(true)}>
            Kirim Link Reset Password
          </Button>
        </div>
      </div>
    </motion.div>
  );

  const renderSection = () => {
    switch (activeTab) {
      case 'password':
        return passwordSection;
      case 'categories':
        return <CategoriesSection isMobile={isMobile} />;
      case 'recurring':
        return <RecurringSection isMobile={isMobile} />;
      case 'data':
        return <DataSection isMobile={isMobile} onLogout={() => setShowLogoutModal(true)} />;
      default:
        return profileSection;
    }
  };

  return (
    <div className={styles.settingsLayout}>
      {/* Navigation (sidebar di desktop, tab horizontal di mobile) */}
      {isMobile && (
        <div className={styles.mobileHeaderWrapper}>
          <h2 className={styles.mobilePageTitle}>Pengaturan</h2>
          <p className={styles.mobilePageSubtitle}>Kelola profil, keamanan & data keuangan Anda</p>
        </div>
      )}
      <aside className={styles.settingsNav}>
        <div className={styles.navHeader}>
          <h2>Pengaturan</h2>
          <span className={styles.navSubtitle}>Kelola profil & akun</span>
        </div>

        <div className={styles.navGroup}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{isMobile ? tab.short : tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.navFooter}>
          <button className={styles.logoutNavBtn} onClick={() => setShowLogoutModal(true)}>
            <LogOut size={16} />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      <main className={styles.settingsContent}>
        {renderSection()}
        {isMobile && (
          <div className={styles.mobileCopyright}>
            <p>© {new Date().getFullYear()} Fundly.id • Hak Cipta Dilindungi</p>
            <p>
              <Link to={ROUTES.PRIVACY}>Kebijakan Privasi</Link> • <Link to={ROUTES.TERMS}>Syarat & Ketentuan</Link>
            </p>
          </div>
        )}
      </main>

      {/* Modal Edit Profile Name */}
      <Modal isOpen={isEditingProfile} onClose={() => !isSavingProfile && setIsEditingProfile(false)} size="sm" title="Ubah Nama Lengkap">
        <form onSubmit={handleSaveProfile} className={styles.emailModalForm}>
          <div className={styles.formGroup}>
            <label>Nama Lengkap</label>
            <div className={styles.inputWithIcon}>
              <User size={16} className={styles.fieldIcon} />
              <input
                type="text"
                value={nameDraft}
                maxLength={60}
                onChange={(e) => setNameDraft(e.target.value)}
                className={styles.formInput}
                autoFocus
                required
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <Button variant="ghost" size="md" type="button" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>
              Batal
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSavingProfile}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation Reset Password */}
      <Modal isOpen={showResetPasswordModal} onClose={() => setShowResetPasswordModal(false)} size="sm" showClose={false}>
        <div className={styles.logoutModalContent}>
          <div className={styles.keyCircle}>
            <KeyRound size={28} />
          </div>
          <h3 className={styles.modalTitle}>Kirim Link Reset Password?</h3>
          <p className={styles.modalDesc}>
            Tautan konfirmasi pembaruan kata sandi akan dikirim ke email <strong>{email}</strong>.
          </p>

          <div className={styles.modalActions}>
            <Button variant="ghost" size="md" onClick={() => setShowResetPasswordModal(false)} disabled={isSendingReset}>
              Batal
            </Button>
            <Button variant="primary" size="md" onClick={() => void handleConfirmResetPassword()} loading={isSendingReset}>
              Kirim Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Change Email */}
      <Modal isOpen={showEmailModal} onClose={() => !isSendingEmail && setShowEmailModal(false)} size="sm" title="Ubah Alamat Email">
        <form onSubmit={handleRequestEmailChange} className={styles.emailModalForm}>
          <div className={styles.infoAlertBox}>
            <AlertCircle size={18} className={styles.alertIcon} />
            <span>Link konfirmasi akan dikirim ke email baru (dan email lama) sebelum email akun diperbarui.</span>
          </div>

          <div className={styles.formGroup}>
            <label>Email Baru</label>
            <div className={styles.inputWithIcon}>
              <Mail size={16} className={styles.fieldIcon} />
              <input
                type="email"
                placeholder="nama@emailbaru.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={styles.formInput}
                autoFocus
                required
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <Button variant="ghost" size="md" type="button" onClick={() => setShowEmailModal(false)} disabled={isSendingEmail}>
              Batal
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSendingEmail}>
              Kirim Verifikasi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal Logout */}
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} size="sm" showClose={false}>
        <div className={styles.logoutModalContent}>
          <div className={styles.warningCircle}>
            <ShieldAlert size={28} />
          </div>
          <h3 className={styles.modalTitle}>Konfirmasi Keluar</h3>
          <p className={styles.modalDesc}>Apakah Anda yakin ingin keluar dari sesi akun ini?</p>

          <div className={styles.modalActions}>
            <Button variant="ghost" size="md" onClick={() => setShowLogoutModal(false)} disabled={isLoggingOut}>
              Batal
            </Button>
            <Button variant="primary" size="md" onClick={() => void handleLogout()} loading={isLoggingOut} className={styles.dangerConfirmBtn}>
              Ya, Keluar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================
// Kategori
// ============================================
const CategoriesSection: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);
  const budgets = useFinanceStore((s) => s.budgets);
  const addCategory = useFinanceStore((s) => s.addCategory);
  const updateCategory = useFinanceStore((s) => s.updateCategory);
  const deleteCategory = useFinanceStore((s) => s.deleteCategory);

  const [type, setType] = useState<CategoryType>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', icon: 'tag', color: COLOR_OPTIONS[0] as string });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => t.category_id && map.set(t.category_id, (map.get(t.category_id) || 0) + 1));
    return map;
  }, [transactions]);

  const list = categories.filter((c) => c.type === type);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', icon: type === 'income' ? 'briefcase' : 'tag', color: COLOR_OPTIONS[list.length % COLOR_OPTIONS.length] });
    setIsFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, icon: c.icon, color: c.color });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error('Nama kategori wajib diisi.');
      return;
    }
    const targetType = editing?.type || type;
    if (categories.some((c) => c.type === targetType && c.name.toLowerCase() === name.toLowerCase() && c.id !== editing?.id)) {
      toast.error('Kategori dengan nama tersebut sudah ada.');
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name, icon: form.icon, color: form.color });
        toast.success(`Kategori "${name}" diperbarui`);
      } else {
        await addCategory({ name, type, icon: form.icon, color: form.color });
        toast.success(`Kategori "${name}" ditambahkan`);
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan kategori.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteCategory(deleteTarget.id);
      toast.success(`Kategori "${deleteTarget.name}" dihapus`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus kategori.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUsage = deleteTarget ? usage.get(deleteTarget.id) || 0 : 0;
  const deleteBudgets = deleteTarget ? budgets.filter((b) => b.category_id === deleteTarget.id).length : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.profileSection}>
      {!isMobile && (
        <div className={styles.contentHeader}>
          <div>
            <h1 className={styles.sectionTitle}>Kategori Transaksi</h1>
            <p className={styles.sectionSubtitle}>Atur kategori pemasukan & pengeluaran sesuai kebutuhan Anda</p>
          </div>
          <div className={styles.headerActions}>
            <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openCreate}>
              Tambah Kategori
            </Button>
          </div>
        </div>
      )}

      <div className={styles.cardBox}>
        <Segmented
          options={[
            { value: 'expense', label: `Pengeluaran (${categories.filter((c) => c.type === 'expense').length})` },
            { value: 'income', label: `Pemasukan (${categories.filter((c) => c.type === 'income').length})` },
          ]}
          value={type}
          onChange={(v) => setType(v as CategoryType)}
        />

        {list.length === 0 ? (
          <EmptyState icon={Tags} title="Belum Ada Kategori" description="Tambahkan kategori pertama Anda." actionLabel="Tambah Kategori" onAction={openCreate} />
        ) : (
          <div className={styles.listStack}>
            {list.map((c) => (
              <div key={c.id} className={styles.listRow}>
                <div className={styles.listIcon} style={{ background: `${c.color}22`, color: readableIconColor(c.color) }}>
                  <DynamicIcon name={c.icon} size={18} />
                </div>
                <div className={styles.listText}>
                  <span className={styles.listTitle}>{c.name}</span>
                  <span className={styles.listSub}>{usage.get(c.id) || 0} transaksi</span>
                </div>
                <div className={styles.listActions}>
                  <button className={styles.editPencilIconBtn} onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}>
                    <Pencil size={14} />
                  </button>
                  <button className={`${styles.editPencilIconBtn} ${styles.dangerIconBtn}`} onClick={() => setDeleteTarget(c)} aria-label={`Hapus ${c.name}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isMobile && (
          <Button variant="primary" size="md" fullWidth icon={<Plus size={16} />} onClick={openCreate}>
            Tambah Kategori {type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </Button>
        )}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSaving && setIsFormOpen(false)}
        size="sm"
        title={editing ? 'Edit Kategori' : `Tambah Kategori ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'}`}
      >
        <form className={formStyles.form} onSubmit={handleSubmit}>
          <ItemPreview
            icon={form.icon}
            color={form.color}
            title={form.name}
            subtitle={(editing?.type || type) === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          />
          <Field label="Nama Kategori" htmlFor="cat-name">
            <input
              id="cat-name"
              className={formStyles.input}
              value={form.name}
              maxLength={40}
              placeholder="Misal: Kopi, Parkir, Dividen"
              autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Ikon">
            <IconPicker icons={CATEGORY_ICON_OPTIONS} value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
          </Field>
          <Field label="Warna">
            <ColorPicker colors={COLOR_OPTIONS} value={form.color} onChange={(color) => setForm({ ...form, color })} />
          </Field>
          <div className={formStyles.actions}>
            <Button variant="ghost" size="md" type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSaving}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Hapus Kategori?"
        description={
          deleteTarget ? (
            <>
              Kategori <strong>{deleteTarget.name}</strong> akan dihapus.
              {deleteUsage > 0 && ` ${deleteUsage} transaksi terkait akan menjadi "Tanpa Kategori".`}
              {deleteBudgets > 0 && ` ${deleteBudgets} anggaran untuk kategori ini juga akan dihapus.`}
            </>
          ) : null
        }
        confirmLabel="Ya, Hapus"
        loading={isSaving}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  );
};

// ============================================
// Transaksi Rutin
// ============================================
const RecurringSection: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const navigate = useNavigate();
  const recurring = useFinanceStore((s) => s.recurring);
  const setRecurringActive = useFinanceStore((s) => s.setRecurringActive);
  const deleteRecurring = useFinanceStore((s) => s.deleteRecurring);
  const categoriesById = useCategoryMap();
  const accountsById = useAccountMap();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTemplate | null>(null);

  const monthlyEstimate = recurring
    .filter((r) => r.is_active)
    .reduce(
      (acc, r) => {
        const factor = r.frequency === 'daily' ? 30 : r.frequency === 'weekly' ? 4.33 : r.frequency === 'monthly' ? 1 : 1 / 12;
        acc[r.type] += r.amount * factor;
        return acc;
      },
      { income: 0, expense: 0 },
    );

  const toggle = async (r: RecurringTemplate) => {
    setBusyId(r.id);
    try {
      await setRecurringActive(r.id, !r.is_active);
      toast.success(r.is_active ? 'Transaksi rutin dijeda' : 'Transaksi rutin diaktifkan kembali');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui transaksi rutin.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteRecurring(deleteTarget.id);
      toast.success('Transaksi rutin dihapus');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus transaksi rutin.');
    } finally {
      setBusyId(null);
    }
  };

  const ended = (r: RecurringTemplate) => Boolean(r.end_date && r.next_run_date > r.end_date);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.profileSection}>
      {!isMobile && (
        <div className={styles.contentHeader}>
          <div>
            <h1 className={styles.sectionTitle}>Transaksi Rutin</h1>
            <p className={styles.sectionSubtitle}>Gaji, tagihan, langganan & cicilan yang tercatat otomatis</p>
          </div>
          <div className={styles.headerActions}>
            <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => navigate(ROUTES.ADD_TRANSACTION)}>
              Tambah
            </Button>
          </div>
        </div>
      )}

      <div className={styles.cardBox}>
        <div className={styles.statGrid}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Estimasi pemasukan rutin / bulan</span>
            <span className={styles.statValue} style={{ color: 'var(--color-success)' }}>
              {formatCurrency(Math.round(monthlyEstimate.income))}
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Estimasi pengeluaran rutin / bulan</span>
            <span className={styles.statValue}>{formatCurrency(Math.round(monthlyEstimate.expense))}</span>
          </div>
        </div>

        {recurring.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Belum Ada Transaksi Rutin"
            description='Saat menambah transaksi, ketuk tombol "Ulangi" untuk menjadikannya transaksi rutin otomatis.'
            actionLabel="Tambah Transaksi Rutin"
            actionIcon={<Plus size={16} />}
            onAction={() => navigate(ROUTES.ADD_TRANSACTION)}
          />
        ) : (
          <div className={styles.listStack}>
            {recurring.map((r) => {
              const cat = r.category_id ? categoriesById.get(r.category_id) : undefined;
              const acc = accountsById.get(r.account_id);
              const color = cat?.color || '#AEAEB2';
              const isEnded = ended(r);
              return (
                <div key={r.id} className={`${styles.listRow} ${!r.is_active ? styles.listRowMuted : ''}`}>
                  <div className={styles.listIcon} style={{ background: `${color}22`, color: readableIconColor(color) }}>
                    <DynamicIcon name={cat?.icon || 'repeat'} size={18} />
                  </div>
                  <div className={styles.listText}>
                    <span className={styles.listTitle}>{r.note || cat?.name || 'Transaksi rutin'}</span>
                    <span className={styles.listSub}>
                      {FREQUENCY_LABEL[r.frequency]} · {acc?.name || 'Akun dihapus'} ·{' '}
                      {isEnded
                        ? 'Selesai'
                        : r.is_active
                          ? `Berikutnya ${r.next_run_date === getTodayISO() ? 'hari ini' : formatRelativeDate(r.next_run_date)} (${formatDate(r.next_run_date, 'dd MMM yyyy')})`
                          : 'Dijeda'}
                    </span>
                  </div>
                  <span className={styles.listAmount} style={{ color: r.type === 'income' ? 'var(--color-success)' : undefined }}>
                    {r.type === 'income' ? '+' : '-'}
                    {formatCurrency(r.amount)}
                  </span>
                  <div className={styles.listActions}>
                    {!isEnded && (
                      <button
                        className={styles.editPencilIconBtn}
                        onClick={() => void toggle(r)}
                        disabled={busyId === r.id}
                        aria-label={r.is_active ? 'Jeda' : 'Aktifkan'}
                        title={r.is_active ? 'Jeda' : 'Aktifkan'}
                      >
                        {r.is_active ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    )}
                    <button
                      className={`${styles.editPencilIconBtn} ${styles.dangerIconBtn}`}
                      onClick={() => setDeleteTarget(r)}
                      aria-label="Hapus"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isMobile && recurring.length > 0 && (
          <Button variant="primary" size="md" fullWidth icon={<Plus size={16} />} onClick={() => navigate(ROUTES.ADD_TRANSACTION)}>
            Tambah Transaksi Rutin
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Hapus Transaksi Rutin?"
        description="Template akan dihapus dan tidak ada transaksi baru yang dibuat otomatis. Transaksi yang sudah tercatat tetap tersimpan."
        confirmLabel="Ya, Hapus"
        loading={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </motion.div>
  );
};

// ============================================
// Data & Ekspor
// ============================================
const DataSection: React.FC<{ isMobile: boolean; onLogout: () => void }> = ({ isMobile, onLogout }) => {
  const transactions = useFinanceStore((s) => s.transactions);
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const budgets = useFinanceStore((s) => s.budgets);
  const goals = useFinanceStore((s) => s.goals);
  const realtimeStatus = useFinanceStore((s) => s.realtimeStatus);
  const lastSyncedAt = useFinanceStore((s) => s.lastSyncedAt);
  const isRefreshing = useFinanceStore((s) => s.isRefreshing);
  const reload = useFinanceStore((s) => s.reload);
  const profile = useAuthStore((s) => s.profile);
  const categoriesById = useCategoryMap();
  const accountsById = useAccountMap();
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [keypadFeedbackOn, setKeypadFeedbackOn] = useState(isKeypadFeedbackEnabled);

  const handleExportAll = async (format: 'csv' | 'xlsx') => {
    if (transactions.length === 0) {
      toast.error('Belum ada transaksi untuk diekspor.');
      return;
    }
    setExporting(format);
    try {
      const dates = transactions.map((t) => t.transaction_date).sort();
      const range = { start: dates[0], end: dates[dates.length - 1] };
      await exportReport(format, {
        title: 'Semua Transaksi',
        periodLabel: 'Seluruh Riwayat',
        range,
        totals: computeTotals(transactions),
        expenseBreakdown: categoryBreakdown(transactions, categoriesById, 'expense'),
        incomeBreakdown: categoryBreakdown(transactions, categoriesById, 'income'),
        transactions,
        categoriesById,
        accountsById,
        ownerName: profile?.full_name || undefined,
      });
      toast.success('Data berhasil diekspor');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengekspor data.');
    } finally {
      setExporting(null);
    }
  };

  const stats = [
    { label: 'Transaksi', value: transactions.length },
    { label: 'Akun', value: accounts.length },
    { label: 'Kategori', value: categories.length },
    { label: 'Anggaran', value: budgets.length },
    { label: 'Target', value: goals.length },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.profileSection}>
      {!isMobile && (
        <div className={styles.contentHeader}>
          <div>
            <h1 className={styles.sectionTitle}>Data & Ekspor</h1>
            <p className={styles.sectionSubtitle}>Cadangkan data keuangan Anda & status sinkronisasi</p>
          </div>
        </div>
      )}

      <div className={styles.cardBox}>
        <div className={styles.cardHeader}>
          <RefreshCw size={20} className={styles.cardHeaderIcon} />
          <h3>Sinkronisasi Realtime</h3>
        </div>
        <p className={styles.passwordDescText}>
          Status:{' '}
          <strong>
            {realtimeStatus === 'live' ? 'Terhubung - perubahan dari perangkat lain tampil otomatis' : realtimeStatus === 'offline' ? 'Terputus - mencoba menghubungkan ulang' : 'Menghubungkan...'}
          </strong>
          {lastSyncedAt && <> · Sinkron terakhir {new Date(lastSyncedAt).toLocaleTimeString('id-ID')}</>}
        </p>
        <div className={styles.statGrid}>
          {stats.map((s) => (
            <div key={s.label} className={styles.statBox}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statValue}>{s.value}</span>
            </div>
          ))}
        </div>
        <div className={styles.passwordActionRow}>
          <Button variant="outline" size="md" icon={<RefreshCw size={16} />} loading={isRefreshing} onClick={() => void reload({ silent: true })}>
            Sinkronkan Sekarang
          </Button>
        </div>
      </div>

      <div className={styles.cardBox}>
        <div className={styles.cardHeader}>
          <Database size={20} className={styles.cardHeaderIcon} />
          <h3>Ekspor Seluruh Transaksi</h3>
        </div>
        <p className={styles.passwordDescText}>
          Unduh seluruh riwayat transaksi beserta ringkasan per kategori sebagai cadangan atau untuk diolah di aplikasi lain.
          Untuk laporan per periode (termasuk PDF), gunakan menu Laporan.
        </p>
        <div className={styles.exportRow}>
          <Button variant="primary" size="md" icon={<FileSpreadsheet size={16} />} loading={exporting === 'xlsx'} onClick={() => void handleExportAll('xlsx')}>
            Excel (.xlsx)
          </Button>
          <Button variant="outline" size="md" icon={<Sheet size={16} />} loading={exporting === 'csv'} onClick={() => void handleExportAll('csv')}>
            CSV
          </Button>
        </div>
      </div>

      <div className={styles.cardBox}>
        <div className={styles.toggleRow}>
          <div className={styles.cardHeader}>
            <Vibrate size={20} className={styles.cardHeaderIcon} />
            <div>
              <h3>Suara & Getar Keypad</h3>
              <p className={styles.passwordDescText}>
                Klik & getar saat mengetik nominal. Suara otomatis senyap saat HP dalam mode senyap.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={keypadFeedbackOn}
            aria-label="Suara & getar keypad"
            className={`${styles.switch} ${keypadFeedbackOn ? styles.switchOn : ''}`}
            onClick={() => {
              const next = !keypadFeedbackOn;
              setKeypadFeedbackEnabled(next);
              setKeypadFeedbackOn(next);
              if (next) keypadFeedback('key');
            }}
          >
            <span className={styles.switchKnob} />
          </button>
        </div>
      </div>

      <div className={styles.cardBox}>
        <div className={styles.cardHeader}>
          <Wallet size={20} className={styles.cardHeaderIcon} />
          <h3>Mata Uang</h3>
        </div>
        <p className={styles.passwordDescText}>
          Seluruh nominal dicatat dalam <strong>Rupiah (IDR)</strong>.
        </p>
      </div>

      <div className={styles.cardBox}>
        <div className={styles.cardHeader}>
          <ShieldAlert size={20} className={styles.cardHeaderIcon} />
          <h3>Privasi & Ketentuan</h3>
        </div>
        <p className={styles.passwordDescText}>
          Pelajari bagaimana data Anda dikelola dan dilindungi. Untuk permintaan penghapusan akun, hubungi kami melalui email yang
          tercantum di Kebijakan Privasi.
        </p>
        <div className={styles.exportRow}>
          <Link to={ROUTES.PRIVACY} className={styles.changeEmailLink}>
            Kebijakan Privasi
          </Link>
          <Link to={ROUTES.TERMS} className={styles.changeEmailLink}>
            Syarat & Ketentuan
          </Link>
        </div>
      </div>

      {isMobile && (
        <Button variant="outline" size="md" fullWidth icon={<LogOut size={16} />} onClick={onLogout} className={styles.mobileLogoutBtn}>
          Keluar Sesi Akun
        </Button>
      )}
    </motion.div>
  );
};
