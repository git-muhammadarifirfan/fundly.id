// ============================================
// Fundly.id — Settings & Edit Profile Page (Dribbble Inspired)
// ============================================

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Bell,
  Palette,
  Globe,
  Shield,
  HelpCircle,
  LogOut,
  Camera,
  Trash2,
  Save,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { useAuthStore } from '../../stores/authStore';
import styles from './SettingsPage.module.css';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

export const SettingsPage: React.FC = () => {
  const { profile, setProfile, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security'>('profile');

  // Form Profile State
  const [firstName, setFirstName] = useState('Arif');
  const [lastName, setLastName] = useState('Irfan');
  const [email, setEmail] = useState('arif.irfan@fundly.id');
  const [phone, setPhone] = useState('+62 812-3456-7890');
  const [currency, setCurrency] = useState('IDR (Rp)');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url || DEFAULT_AVATAR);
  
  // Feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        if (profile) {
          setProfile({ ...profile, avatar_url: result });
        }
        showToast('Foto profil berhasil di-upload!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePicture = () => {
    setAvatarUrl(DEFAULT_AVATAR);
    showToast('Foto profil dikembalikan ke default');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Perubahan profil berhasil disimpan!');
  };

  return (
    <div className={styles.settingsLayout}>
      {/* Sidebar Settings Tabs */}
      <aside className={styles.settingsNav}>
        <div className={styles.navHeader}>
          <h2>Pengaturan</h2>
          <span className={styles.navSubtitle}>Kelola akun & preferensi Anda</span>
        </div>

        <div className={styles.navGroup}>
          <span className={styles.groupLabel}>GENERAL</span>
          <button
            className={cn(styles.navItem, activeTab === 'profile' && styles.navItemActive)}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
          <button
            className={cn(styles.navItem, activeTab === 'notifications' && styles.navItemActive)}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            <span>Notifikasi</span>
          </button>
          <button
            className={cn(styles.navItem, activeTab === 'appearance' && styles.navItemActive)}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={18} />
            <span>Tampilan & Tema</span>
          </button>
        </div>

        <div className={styles.navGroup}>
          <span className={styles.groupLabel}>AKUN & KEAMANAN</span>
          <button
            className={cn(styles.navItem, activeTab === 'security' && styles.navItemActive)}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} />
            <span>Keamanan & Password</span>
          </button>
        </div>

        <div className={styles.navFooter}>
          <button className={styles.logoutNavBtn} onClick={logout}>
            <LogOut size={16} />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Settings Content */}
      <main className={styles.settingsContent}>
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.profileSection}
          >
            {/* Header Content */}
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.sectionTitle}>Profil Anda</h1>
                <p className={styles.sectionSubtitle}>Terakhir diperbarui pada 10 September 2026</p>
              </div>
              <div className={styles.headerActions}>
                <Button variant="ghost" size="sm" icon={<RotateCcw size={15} />}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" icon={<Save size={15} />} onClick={handleSave}>
                  Simpan Perubahan
                </Button>
              </div>
            </div>

            {/* Profile Picture Card */}
            <div className={styles.cardBox}>
              <div className={styles.cardHeader}>
                <Camera size={18} className={styles.cardHeaderIcon} />
                <h3>Foto Profil</h3>
              </div>
              <div className={styles.avatarRow}>
                <div className={styles.avatarPreviewWrap}>
                  <img src={avatarUrl} alt="Avatar Profile" className={styles.avatarImg} />
                  <button
                    className={styles.avatarEditBadge}
                    onClick={() => fileInputRef.current?.click()}
                    title="Ganti Foto"
                  >
                    <Camera size={14} />
                  </button>
                </div>
                <div className={styles.avatarActions}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Ganti Foto
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeletePicture}
                    className={styles.deletePicBtn}
                  >
                    Hapus Foto
                  </Button>
                </div>
              </div>
            </div>

            {/* Personal Information Form */}
            <form onSubmit={handleSave} className={styles.cardBox}>
              <div className={styles.cardHeader}>
                <User size={18} className={styles.cardHeaderIcon} />
                <h3>Informasi Pribadi</h3>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Nama Depan</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Nama Belakang</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Alamat Email</label>
                  <div className={styles.inputWithIcon}>
                    <Mail size={16} className={styles.fieldIcon} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Nomor HP / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Mata Uang Utama</label>
                  <div className={styles.inputWithIcon}>
                    <Globe size={16} className={styles.fieldIcon} />
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={styles.formInput}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </main>

      {/* Floating Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className={styles.toastPill}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Check size={16} color="var(--color-primary)" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

