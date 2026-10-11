// ============================================
// Fundly.id - Umpan balik keypad: suara klik & getar ala iPhone
// - Suara dibuat dengan Web Audio (tanpa file). Di iPhone, sesi audio "ambient"
//   membuat suara otomatis senyap saat sakelar mute/mode senyap aktif.
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

// ---------------- Suara ----------------
type AudioCtor = typeof AudioContext;
let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor: AudioCtor | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      // Safari 16.4+: "ambient" = ikut senyap saat iPhone di-mute, tidak menghentikan musik lain
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'ambient';
    } catch {
      // abaikan
    }
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const length = Math.floor(ctx.sampleRate * 0.04);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Klik pendek renyah (noise ter-filter dengan peluruhan cepat), mirip ketukan keyboard iPhone. */
function playClick(ctx: AudioContext, frequency: number, volume: number) {
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 1.4;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
  source.stop(now + 0.04);
}

/** Dua nada naik yang lembut untuk konfirmasi simpan. */
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const start = now + i * 0.07;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

function playSound(kind: FeedbackKind) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (kind === 'success') playChime(ctx);
    else if (kind === 'delete') playClick(ctx, 1500, 0.35);
    else playClick(ctx, 2600, 0.4);
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
  playSound(kind);
}
