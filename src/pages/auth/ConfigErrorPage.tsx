import React from 'react';
import { ServerCrash } from 'lucide-react';
import styles from './AuthPage.module.css';
import { LogoMark } from '../../components/ui/Logo/LogoMark';

/** Ditampilkan jika kredensial Supabase belum diisi di file .env */
export const ConfigErrorPage: React.FC = () => (
  <div className={styles.authContainer}>
    <div className={styles.authCard}>
      <div className={styles.formSide}>
        <div className={styles.brandHeader}>
          <div className={styles.brandLogoCircle}>
            <LogoMark size={22} className={styles.logoSymbol} />
          </div>
          <span className={styles.brandName}>Fundly.id</span>
        </div>

        <div className={styles.successStateContainer}>
          <div className={styles.successCircle} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            <ServerCrash size={34} />
          </div>
          <h2>Konfigurasi Belum Lengkap</h2>
          <p>
            Aplikasi belum terhubung ke database. Isi <strong>VITE_SUPABASE_URL</strong> dan{' '}
            <strong>VITE_SUPABASE_ANON_KEY</strong> pada file <code>.env</code>, lalu jalankan ulang aplikasi.
          </p>
          <p style={{ fontSize: '12px', color: '#88888C' }}>
            Panduan lengkap tersedia di <code>server/SUPABASE_SETUP_GUIDE.md</code>.
          </p>
        </div>

        <div className={styles.copyrightText} style={{ marginTop: 'auto' }}>
          © {new Date().getFullYear()} Fundly.id • Hak Cipta Dilindungi
        </div>
      </div>
    </div>
  </div>
);
