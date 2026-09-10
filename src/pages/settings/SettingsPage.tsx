// Fundly.id — Settings Page
import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { User, Palette, Tag, Download, Shield, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import styles from './SettingsPage.module.css';

const SETTINGS_GROUPS = [
  {
    title: 'Akun',
    items: [
      { label: 'Profil', icon: User, desc: 'Nama, email, foto profil' },
      { label: 'Tampilan', icon: Palette, desc: 'Tema, bahasa, mata uang' },
    ],
  },
  {
    title: 'Data',
    items: [
      { label: 'Kategori', icon: Tag, desc: 'Kelola kategori kustom' },
      { label: 'Export/Import', icon: Download, desc: 'Backup data ke CSV/Excel/PDF' },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { label: 'Keamanan', icon: Shield, desc: 'Password, 2FA' },
      { label: 'Bantuan', icon: HelpCircle, desc: 'FAQ, hubungi kami' },
    ],
  },
];

export const SettingsPage: React.FC = () => {
  return (
    <div className={styles.page}>
      {/* User Card */}
      <Card padding="lg" className={styles.userCard}>
        <div className={styles.userAvatar}>
          <User size={24} />
        </div>
        <div className={styles.userInfo}>
          <h2 className={styles.userName}>Pengguna</h2>
          <p className={styles.userEmail}>user@fundly.id</p>
        </div>
        <Button variant="outline" size="sm">Edit</Button>
      </Card>

      {/* Settings Groups */}
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.title} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          <Card padding="none">
            {group.items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button key={item.label} className={styles.settingItem} style={{ borderBottom: idx < group.items.length - 1 ? '1px solid var(--color-divider)' : 'none' }}>
                  <div className={styles.settingIcon}><Icon size={20} /></div>
                  <div className={styles.settingText}>
                    <span className={styles.settingLabel}>{item.label}</span>
                    <span className={styles.settingDesc}>{item.desc}</span>
                  </div>
                  <ChevronRight size={18} className={styles.settingChevron} />
                </button>
              );
            })}
          </Card>
        </div>
      ))}

      {/* Logout */}
      <Button variant="danger" size="lg" fullWidth icon={<LogOut size={18} />} className={styles.logoutBtn}>
        Keluar
      </Button>

      <p className={styles.version}>Fundly v1.0.0</p>
    </div>
  );
};
