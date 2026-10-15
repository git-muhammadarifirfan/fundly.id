// ============================================
// Fundly.id - Mode Ringan (untuk HP spesifikasi rendah, mis. RAM 2GB)
// Otomatis aktif di perangkat lemah; bisa dipaksa nyala/mati di Pengaturan.
// Saat aktif: animasi berat diselesaikan instan, transisi CSS dimatikan,
// prefetch halaman di latar belakang tidak dijalankan.
// ============================================

import { create } from 'zustand';
import { gsap } from 'gsap';

export type LiteModePreference = 'auto' | 'on' | 'off';

const PREF_KEY = 'fundly-lite-mode';

interface NavigatorPerf extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Deteksi perangkat lemah: RAM ≤ 2GB, CPU ≤ 2 core, atau mode hemat data. */
export function detectLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as NavigatorPerf;
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2;
  return lowMemory || lowCpu || Boolean(nav.connection?.saveData);
}

function readPreference(): LiteModePreference {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === 'on' || v === 'off' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function resolveLite(pref: LiteModePreference): boolean {
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  return detectLowEndDevice();
}

/** Terapkan ke DOM & mesin animasi. */
function applyLite(lite: boolean) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('lite', lite);
  // Animasi GSAP berjalan 25x lebih cepat (praktis instan) tanpa mengubah kode di tiap halaman
  gsap.globalTimeline.timeScale(lite ? 25 : 1);
}

interface PerfState {
  preference: LiteModePreference;
  lite: boolean;
  lowEndDetected: boolean;
  setPreference: (pref: LiteModePreference) => void;
}

const initialPref = readPreference();
const initialLite = resolveLite(initialPref);
applyLite(initialLite);

export const usePerfStore = create<PerfState>((set) => ({
  preference: initialPref,
  lite: initialLite,
  lowEndDetected: detectLowEndDevice(),
  setPreference: (preference) => {
    try {
      localStorage.setItem(PREF_KEY, preference);
    } catch {
      // abaikan
    }
    const lite = resolveLite(preference);
    applyLite(lite);
    set({ preference, lite });
  },
}));

/** Cek cepat di luar React (mis. di store lain). */
export const isLiteMode = () => usePerfStore.getState().lite;
