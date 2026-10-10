import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button/Button';
import { ROUTES } from '../../config/routes';
import { isValidEmail, useAuthStore, type OAuthProvider } from '../../stores/authStore';
import { enabledOAuthProviders, readAuthUrlError } from './authHelpers';
import styles from './AuthPage.module.css';
import { LogoMark } from '../../components/ui/Logo/LogoMark';

const GoogleIcon = () => (
  <svg className={styles.socialIcon} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const AppleIcon = () => (
  <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.07c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.14 1.86-1 2.97 1.08.08 2.18-.57 2.83-1.37z" />
  </svg>
);

const SOCIAL: Record<OAuthProvider, { label: string; icon: React.FC }> = {
  google: { label: 'Masuk dengan Google', icon: GoogleIcon },
  facebook: { label: 'Masuk dengan Facebook', icon: FacebookIcon },
  apple: { label: 'Masuk dengan Apple', icon: AppleIcon },
};

export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginWithOAuth, resendConfirmation } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const urlError = readAuthUrlError();
    if (urlError) toast.error(urlError);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Harap isi alamat email dan password Anda');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Format alamat email tidak valid.');
      return;
    }

    setIsLoading(true);
    const { error } = await loginWithEmail(email, password, rememberMe);
    setIsLoading(false);

    if (error) {
      setNeedsConfirmation(error.toLowerCase().includes('belum dikonfirmasi'));
      toast.error(error);
    } else {
      // Redirect ke halaman tujuan ditangani oleh PublicAuthRoute
      toast.success('Selamat datang kembali di Fundly.id!');
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    const { error } = await resendConfirmation(email);
    setIsResending(false);
    if (error) toast.error(error);
    else toast.success(`Email konfirmasi dikirim ulang ke ${email}`);
  };

  const handleSocialLogin = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    const { error } = await loginWithOAuth(provider);
    if (error) {
      setOauthLoading(null);
      toast.error(error);
    }
    // Jika berhasil, browser diarahkan ke halaman login provider
  };

  const providers = enabledOAuthProviders();

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

          <div className={styles.formHeader}>
            <h2>Selamat Datang Kembali</h2>
            <p>Kelola keuangan Anda dengan lebih cerdas dan teratur.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.authForm} noValidate>
            <div className={styles.formGroup}>
              <label htmlFor="login-email">Alamat Email</label>
              <div className={styles.inputWithIcon}>
                <Mail size={18} className={styles.fieldIcon} />
                <input
                  id="login-email"
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
              <div className={styles.labelRow}>
                <label htmlFor="login-password">Password</label>
                <Link to={ROUTES.RESET_PASSWORD_REQUEST} className={styles.forgotLink}>
                  Lupa Password?
                </Link>
              </div>
              <div className={styles.inputWithIcon}>
                <Lock size={18} className={styles.fieldIcon} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.formInput}
                  autoComplete="current-password"
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
            </div>

            <div className={styles.rememberRow}>
              <label className={styles.checkboxContainer}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <span className={styles.checkmark} />
                <span className={styles.rememberText}>Ingat Saya di Perangkat Ini</span>
              </label>
            </div>

            {needsConfirmation && (
              <button type="button" className={styles.inlineLinkBtn} onClick={() => void handleResend()} disabled={isResending}>
                {isResending ? 'Mengirim ulang...' : 'Belum menerima email konfirmasi? Kirim ulang'}
              </button>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} icon={<ArrowRight size={18} />}>
              Masuk Sesi Akun
            </Button>
          </form>

          {providers.length > 0 && (
            <>
              <div className={styles.dividerRow}>
                <span className={styles.dividerLine} />
                <span className={styles.dividerText}>atau lanjutkan dengan</span>
                <span className={styles.dividerLine} />
              </div>

              <div className={styles.socialButtonsGroup}>
                {providers.map((provider) => {
                  const { label, icon: Icon } = SOCIAL[provider];
                  return (
                    <button
                      key={provider}
                      type="button"
                      className={styles.socialBtn}
                      disabled={Boolean(oauthLoading)}
                      onClick={() => void handleSocialLogin(provider)}
                    >
                      <Icon />
                      <span>{oauthLoading === provider ? 'Menghubungkan...' : label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className={styles.footerLinkRow}>
            <span>Belum memiliki akun?</span>
            <Link to={ROUTES.REGISTER} className={styles.registerLink}>
              Daftar Sekarang
            </Link>
          </div>

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
