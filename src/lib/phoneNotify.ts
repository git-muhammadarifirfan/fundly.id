// ============================================
// Fundly.id - Notifikasi HP (Notification API via service worker)
// Android: Chrome / PWA. iPhone: iOS 16.4+ dan aplikasi harus ditambahkan ke Layar Utama.
// ============================================

const PREF_KEY = 'fundly-phone-alerts';

export type NotifyPermission = NotificationPermission | 'unsupported';

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notifyPermission(): NotifyPermission {
  return notifySupported() ? Notification.permission : 'unsupported';
}

/** Preferensi user di perangkat ini (default aktif jika izin sudah diberikan) */
export function phoneAlertsEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setPhoneAlertsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    // abaikan
  }
}

/** Minta izin notifikasi (harus dipanggil dari aksi user, mis. ketuk tombol) */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!notifySupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') setPhoneAlertsEnabled(true);
    return result;
  } catch {
    return Notification.permission;
  }
}

export function isIOS(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/** Tampilkan notifikasi sistem (muncul di panel notifikasi HP) */
export async function showPhoneNotification(opts: { id: string; title: string; body: string; url: string }): Promise<boolean> {
  if (notifyPermission() !== 'granted' || !phoneAlertsEnabled()) return false;
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: opts.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: opts.id,
    data: { url: opts.url },
    vibrate: [60, 40, 60],
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(opts.title, options);
      return true;
    }
    const n = new Notification(opts.title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
