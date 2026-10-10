import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button/Button';
import { ROUTES } from '../../config/routes';
import { isValidEmail, useAuthStore } from '../../stores/authStore';
import styles from './AuthPage.module.css';
import { LogoMark } from '../../components/ui/Logo/LogoMark';

const RESEND_COOLDOWN = 60;

export const ResetPasswordRequestPage: React.FC = () => {
  const { requestResetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendLink = async () => {
    if (!isValidEmail(email)) {
      toast.error('Masukkan alamat email yang valid!');
      return;
    }
    setIsLoading(true);
    const { error } = await requestResetPassword(email);
    setIsLoading(false);

    if (error) {
      toast.error(error);
    } else {
      setIsSubmitted(true);
      setCooldown(RESEND_COOLDOWN);
      toast.success(`Tautan reset password telah dikirim ke ${email}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendLink();
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.formSide}>
          <div className={styles.brandHeader}>
            <div className={styles.brandLogoCircle}>
              <LogoMark size={22} className={styles.logoSymbol} />
            </div>
            <span className={styles.brandName}>Fundly.id</span>
          </div>

          {!isSubmitted ? (
            <>
              <div className={styles.formHeader}>
                <h2>Lupa Password?</h2>
                <p>Masukkan alamat email Anda untuk menerima tautan atur ulang kata sandi.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
                <div className={styles.formGroup}>
                  <label htmlFor="reset-email">Alamat Email Terdaftar</label>
                  <div className={styles.inputWithIcon}>
                    <Mail size={18} className={styles.fieldIcon} />
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.formInput}
                      autoComplete="email"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} icon={<Send size={18} />}>
                  Kirim Tautan Reset Password
                </Button>
              </form>

              <div className={styles.footerLinkRow} style={{ marginTop: '24px' }}>
                <Link
                  to={ROUTES.LOGIN}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1C1C1E' }}
                >
                  <ArrowLeft size={16} /> Kembali ke Halaman Masuk
                </Link>
              </div>
            </>
          ) : (
            <div className={styles.successStateContainer}>
              <div className={styles.successCircle}>
                <CheckCircle2 size={36} />
              </div>
              <h2>Cek Email Anda 📬</h2>
              <p>
                Jika <strong>{email}</strong> terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim. Tautan berlaku
                selama 1 jam.
              </p>
              <p style={{ fontSize: '12px', color: '#88888C', marginTop: '4px' }}>
                Tidak menerima email? Periksa folder spam Anda atau kirim ulang.
              </p>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                <Button variant="ghost" size="md" fullWidth loading={isLoading} disabled={cooldown > 0} onClick={() => void sendLink()}>
                  {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang Email'}
                </Button>
                <Link to={ROUTES.LOGIN} style={{ width: '100%' }}>
                  <Button variant="outline" size="md" fullWidth icon={<ArrowLeft size={16} />}>
                    Kembali ke Masuk
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className={styles.copyrightText} style={{ marginTop: 'auto' }}>
            © {new Date().getFullYear()} Fundly.id Corporation • Hak Cipta Dilindungi
          </div>
        </div>
      </div>
    </div>
  );
};
