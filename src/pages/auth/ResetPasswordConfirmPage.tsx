import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, ArrowRight, LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button/Button';
import { PageLoader } from '../../components/ui/PageLoader/PageLoader';
import { ROUTES } from '../../config/routes';
import { useAuthStore, validatePassword } from '../../stores/authStore';
import { readAuthUrlError } from './authHelpers';
import styles from './AuthPage.module.css';
import { LogoMark } from '../../components/ui/Logo/LogoMark';

export const ResetPasswordConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, isAuthenticated, isLoading: authLoading, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setLinkError(readAuthUrlError());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error('Harap isi kedua bidang kata sandi!');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      toast.error(pwError);
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
      toast.error(error);
    } else {
      setIsSuccess(true);
      toast.success('Kata sandi berhasil diperbarui!');
    }
  };

  const handleCancel = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  // Tunggu Supabase memproses token dari tautan email
  if (authLoading) return <PageLoader message="Memverifikasi tautan reset..." />;

  const invalidLink = !isSuccess && (!isAuthenticated || linkError);

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

          {invalidLink ? (
            <div className={styles.successStateContainer}>
              <div className={styles.successCircle} style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                <LinkIcon size={34} />
              </div>
              <h2>Tautan Tidak Valid</h2>
              <p>{linkError || 'Tautan reset password sudah kedaluwarsa atau sudah pernah digunakan. Silakan minta tautan baru.'}</p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                <Link to={ROUTES.RESET_PASSWORD_REQUEST} style={{ width: '100%' }}>
                  <Button variant="primary" size="lg" fullWidth>
                    Minta Tautan Baru
                  </Button>
                </Link>
                <Link to={ROUTES.LOGIN} style={{ width: '100%' }}>
                  <Button variant="outline" size="md" fullWidth icon={<ArrowLeft size={16} />}>
                    Kembali ke Halaman Masuk
                  </Button>
                </Link>
              </div>
            </div>
          ) : !isSuccess ? (
            <>
              <div className={styles.formHeader}>
                <h2>Atur Ulang Kata Sandi</h2>
                <p>Masukkan kata sandi baru untuk mengamankan kembali akun Anda.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
                <div className={styles.formGroup}>
                  <label htmlFor="new-password">Kata Sandi Baru</label>
                  <div className={styles.inputWithIcon}>
                    <Lock size={18} className={styles.fieldIcon} />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 8 karakter, huruf & angka"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.formInput}
                      autoComplete="new-password"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</label>
                  <div className={styles.inputWithIcon}>
                    <Lock size={18} className={styles.fieldIcon} />
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ulangi kata sandi baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={styles.formInput}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
                  Simpan Kata Sandi Baru
                </Button>
                <button type="button" className={styles.inlineLinkBtn} onClick={() => void handleCancel()}>
                  Batalkan & keluar
                </button>
              </form>
            </>
          ) : (
            <div className={styles.successStateContainer}>
              <div className={styles.successCircle}>
                <CheckCircle2 size={36} />
              </div>
              <h2>Kata Sandi Berhasil Diperbarui!</h2>
              <p>Kata sandi baru Anda sudah aktif. Anda dapat langsung melanjutkan ke dashboard.</p>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<ArrowRight size={18} />}
                onClick={() => navigate(ROUTES.DASHBOARD, { replace: true })}
              >
                Lanjut ke Dashboard
              </Button>
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
