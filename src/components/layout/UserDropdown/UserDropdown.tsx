// ============================================
// Fundly.id — User Profile & Logout Dropdown Menu
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { User, Settings, LogOut, ShieldAlert, ChevronRight } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { Button } from '../../ui/Button/Button';
import { ROUTES } from '../../../config/routes';
import { useAuthStore } from '../../../stores/authStore';
import styles from './UserDropdown.module.css';

interface UserDropdownProps {
  mobileView?: boolean;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ mobileView = false }) => {
  const navigate = useNavigate();
  const { logout, profile, user } = useAuthStore();
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const email = user?.email || '';
  const avatarUrl = profile?.avatar_url || '';
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
    setIsOpen(false);
    toast.success('Anda berhasil keluar dari sesi');
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const avatar = (size: number) =>
    avatarUrl ? (
      <img src={avatarUrl} alt={displayName} className={styles.avatarImg} referrerPolicy="no-referrer" />
    ) : (
      <User size={size} />
    );

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      {/* Trigger Button */}
      {mobileView ? (
        <button
          className={styles.mobileAvatarBtn}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Menu Akun"
        >
          <div className={styles.avatarCircle}>
            {avatar(20)}
          </div>
          <div className={styles.userTextCol}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>Personal</span>
          </div>
        </button>
      ) : (
        <button
          className={styles.desktopUserBtn}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Menu Akun"
        >
          <div className={styles.avatarCircle}>
            {avatar(18)}
          </div>
          <div className={styles.userTextCol}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>Personal</span>
          </div>
        </button>
      )}

      {/* Floating Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdownMenu}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className={styles.menuHeader}>
              <div className={styles.menuAvatarLarge}>
                {avatar(22)}
              </div>
              <div className={styles.menuUserInfo}>
                <span className={styles.menuUserName}>{displayName}</span>
                <span className={styles.menuUserEmail}>{email}</span>
              </div>
            </div>

            <div className={styles.menuDivider} />

            <div className={styles.menuGroup}>
              <button
                className={styles.menuItem}
                onClick={() => {
                  setIsOpen(false);
                  navigate(ROUTES.SETTINGS);
                }}
              >
                <div className={styles.itemLeft}>
                  <Settings size={16} className={styles.itemIcon} />
                  <span>Pengaturan Profil</span>
                </div>
                <ChevronRight size={14} className={styles.itemArrow} />
              </button>
            </div>

            <div className={styles.menuDivider} />

            <button
              className={styles.logoutItem}
              onClick={() => {
                setIsOpen(false);
                setShowLogoutModal(true);
              }}
            >
              <LogOut size={16} />
              <span>Keluar Sesi</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal Logout */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        size="sm"
        showClose={false}
      >
        <div className={styles.logoutModalContent}>
          <div className={styles.warningCircle}>
            <ShieldAlert size={28} />
          </div>
          <h3 className={styles.modalTitle}>Konfirmasi Keluar</h3>
          <p className={styles.modalDesc}>
            Apakah Anda yakin ingin keluar dari sesi akun ini?
          </p>

          <div className={styles.modalActions}>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowLogoutModal(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmLogout}
              loading={isLoggingOut}
              className={styles.dangerConfirmBtn}
            >
              Ya, Keluar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
