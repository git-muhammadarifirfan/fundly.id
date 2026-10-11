// ============================================
// Fundly.id - Umpan balik keypad: getar halus ala iPhone (tanpa suara)
// - Getar: navigator.vibrate (Android) atau haptic "switch" Safari (iOS 18+).
// - Bisa dimatikan pengguna lewat Pengaturan (disimpan di perangkat).
// ============================================

const PREF_KEY = 'fundly-keypad-feedback';

export type FeedbackKind = 'key' | 'delete' | 'success';

export function isKeypadFeedbackEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setKeypadFeedbackEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? 'on' : 'off');
  } catch {
    // abaikan
  }
}

// ---------------- Getar / haptic ----------------
let iosSwitchLabel: HTMLLabelElement | null = null;

/** Safari iOS 18+ memicu haptic sistem saat <input type="checkbox" switch> di-toggle. */
function iosHaptic() {
  if (typeof document === 'undefined') return;
  if (!iosSwitchLabel) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;left:-9999px;top:0;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitchLabel = label;
  }
  iosSwitchLabel.click();
}

function vibrate(kind: FeedbackKind) {
  const pattern = kind === 'success' ? [12, 40, 18] : kind === 'delete' ? 14 : 8;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
      return;
    } catch {
      // lanjut ke cara iOS
    }
  }
  try {
    iosHaptic();
  } catch {
    // abaikan
  }
}

/** Panggil di dalam handler ketukan (user gesture). */
export function keypadFeedback(kind: FeedbackKind = 'key'): void {
  if (!isKeypadFeedbackEnabled()) return;
  vibrate(kind);
}
