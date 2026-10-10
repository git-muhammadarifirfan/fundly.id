// ============================================
// Fundly.id — Layout untuk halaman legal (publik, tanpa login)
// ============================================

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { LEGAL_LAST_UPDATED } from '../../config/constants';
import { useAuthStore } from '../../stores/authStore';
import styles from './LegalLayout.module.css';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalLayoutProps {
  badge: string;
  title: string;
  documentTitle: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ badge, title, documentTitle, intro, sections }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const previous = document.title;
    document.title = `${documentTitle} — Fundly.id`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <Link to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} className={styles.brand}>
            <span className={styles.brandLogo}>F</span>
            <span className={styles.brandName}>Fundly.id</span>
          </Link>
          <Link to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} className={styles.backLink}>
            <ArrowLeft size={15} /> {isAuthenticated ? 'Kembali ke Aplikasi' : 'Masuk'}
          </Link>
        </div>

        <article className={styles.card}>
          <span className={styles.badge}>
            <ShieldCheck size={13} /> {badge}
          </span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.updated}>Terakhir diperbarui: {LEGAL_LAST_UPDATED}</p>
          <div className={styles.intro}>{intro}</div>

          <nav className={styles.toc} aria-label="Daftar isi">
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className={styles.tocLink}>
                {i + 1}. {s.title}
              </a>
            ))}
          </nav>

          <div className={styles.content}>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className={styles.section}>
                <h2>
                  {i + 1}. {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </div>
        </article>

        <footer className={styles.footer}>
          <div className={styles.footerLinks}>
            <Link to={ROUTES.PRIVACY}>Kebijakan Privasi</Link>
            <Link to={ROUTES.TERMS}>Syarat & Ketentuan</Link>
          </div>
          <span>© {new Date().getFullYear()} Fundly.id • Hak Cipta Dilindungi</span>
        </footer>
      </div>
    </div>
  );
};
