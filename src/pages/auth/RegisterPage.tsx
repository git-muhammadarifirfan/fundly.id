import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, MailCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button/Button';
import { ROUTES } from '../../config/routes';
import { isValidEmail, useAuthStore, validatePassword } from '../../stores/authStore';
import styles from './AuthPage.module.css';

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score, label: 'Lemah', color: 'var(--color-danger)' };
  if (score <= 3) return { score, label: 'Cukup', color: 'var(--color-warning)' };
  return { score, label: 'Kuat', color: 'var(--color-success)' };
}

export const RegisterPage: React.FC = () => {
  const { registerWithEmail, resendConfirmation } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email || !password) {
      toast.error('Harap isi semua bidang pendaftaran!');
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Format alamat email tidak valid.');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      toast.error(pwError);
      return;
    }
    if (!agreeTerms) {
      toast.error('Anda harus menyetujui Syarat & Ketentuan!');
      return;
    }

    setIsLoading(true);
    const { error, needsConfirmation } = await registerWithEmail(email, password, fullName);
    setIsLoading(false);

    if (error) {
      toast.error(error);
    } else if (needsConfirmation) {
      setConfirmationSentTo(email.trim());
      toast.success('Pendaftaran berhasil! Cek email Anda untuk konfirmasi.');
    } else {
      // Sesi langsung aktif → PublicAuthRoute mengarahkan ke Dashboard
      toast.success('Pendaftaran akun berhasil! Selamat datang di Fundly.id');
    }
  };

  const handleResend = async () => {
    if (!confirmationSentTo) return;
    setIsResending(true);
    const { error } = await resendConfirmation(confirmationSentTo);
    setIsResending(false);
    if (error) toast.error(error);
    else toast.success(`Email konfirmasi dikirim ulang ke ${confirmationSentTo}`);
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.formSide}>
          <div className={styles.brandHeader}>
            <div className={styles.brandLogoCircle}>
              <span className={styles.logoSymbol}>F</span>
            </div>
            <span className={styles.brandName}>Fundly.id</span>
          </div>

          {confirmationSentTo ? (
            <div className={styles.successStateContainer}>
              <div className={styles.successCircle}>
                <MailCheck size={36} />
              </div>
              <h2>Konfirmasi Email Anda 📬</h2>
              <p>
                Kami telah mengirim tautan konfirmasi ke <strong>{confirmationSentTo}</strong>. Klik tautan tersebut untuk
                mengaktifkan akun, lalu masuk ke Fundly.id.
              </p>
              <p style={{ fontSize: '12px', color: '#88888C', marginTop: '4px' }}>
                Tidak menerima email? Periksa folder spam atau kirim ulang.
              </p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                <Button variant="ghost" size="md" fullWidth loading={isResending} onClick={() => void handleResend()}>
                  Kirim Ulang Email Konfirmasi
                </Button>
                <Link to={ROUTES.LOGIN} style={{ width: '100%' }}>
                  <Button variant="outline" size="md" fullWidth icon={<ArrowLeft size={16} />}>
                    Ke Halaman Masuk
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h2>Buat Akun Baru</h2>
                <p>Mulai kelola keuangan Anda secara efisien dalam hitungan menit.</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
                <div className={styles.formGroup}>
                  <label htmlFor="reg-name">Nama Lengkap</label>
                  <div className={styles.inputWithIcon}>
                    <User size={18} className={styles.fieldIcon} />
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="Nama lengkap Anda"
                      value={fullName}
                      maxLength={60}
                      onChange={(e) => setFullName(e.target.value)}
                      className={styles.formInput}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="reg-email">Alamat Email</label>
                  <div className={styles.inputWithIcon}>
                    <Mail size={18} className={styles.fieldIcon} />
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.formInput}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="reg-password">Password</label>
                  <div className={styles.inputWithIcon}>
                    <Lock size={18} className={styles.fieldIcon} />
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 8 karakter, huruf & angka"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.formInput}
                      autoComplete="new-password"
                      required
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
                  {password && (
                    <div className={styles.strengthRow}>
                      <div className={styles.strengthTrack}>
                        <div
                          className={styles.strengthFill}
                          style={{ width: `${Math.min(100, (strength.score / 5) * 100)}%`, background: strength.color }}
                        />
                      </div>
                      <span style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className={styles.rememberRow}>
                  <label className={styles.checkboxContainer}>
                    <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                    <span className={styles.checkmark} />
                    <span className={styles.rememberText}>
                      Saya menyetujui{' '}
                      <a href={ROUTES.TERMS} target="_blank" rel="noopener noreferrer" className={styles.inlineLegalLink}>
                        Syarat & Ketentuan
                      </a>{' '}
                      serta{' '}
                      <a href={ROUTES.PRIVACY} target="_blank" rel="noopener noreferrer" className={styles.inlineLegalLink}>
                        Kebijakan Privasi
                      </a>
                    </span>
                  </label>
                </div>

                <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} icon={<ArrowRight size={18} />}>
                  Daftar Akun Sekarang
                </Button>
              </form>

              <div className={styles.footerLinkRow}>
                <span>Sudah memiliki akun?</span>
                <Link to={ROUTES.LOGIN} className={styles.registerLink}>
                  Masuk Sesi
                </Link>
              </div>
            </>
          )}

          <div className={styles.legalLinks}>
            <Link to={ROUTES.PRIVACY}>Kebijakan Privasi</Link>
            <span>•</span>
            <Link to={ROUTES.TERMS}>Syarat & Ketentuan</Link>
          </div>
          <div className={styles.copyrightText}>© {new Date().getFullYear()} Fundly.id Corporation • Hak Cipta Dilindungi</div>
        </div>
      </div>
    </div>
  );
};
