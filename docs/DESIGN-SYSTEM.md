# Fundly.id — Panduan Design System

## Color Palette

### Warna Utama (Lime Green Theme)

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-primary` | `#C6E83B` | Tombol utama, accent, highlight |
| `--color-primary-hover` | `#B8D635` | Hover state tombol utama |
| `--color-primary-light` | `#E8F5A1` | Background ringan, avatar |
| `--color-primary-subtle` | `#F4FAD2` | Subtle backgrounds |

### Warna Gelap

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-dark` | `#1C1C1E` | Card gelap, bottom nav, tombol dark |
| `--color-dark-secondary` | `#2C2C2E` | Hover dark |
| `--color-dark-tertiary` | `#3A3A3C` | Border di dark theme |

### Warna Background

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-bg` | `#F5F5F7` | Background utama halaman |
| `--color-bg-card` | `#FFFFFF` | Background card |
| `--color-bg-input` | `#F2F2F7` | Background input, numpad key |
| `--color-bg-overlay` | `rgba(0,0,0,0.4)` | Backdrop modal |

### Warna Teks

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-text-primary` | `#1C1C1E` | Teks utama |
| `--color-text-secondary` | `#6E6E73` | Teks sekunder, label |
| `--color-text-tertiary` | `#AEAEB2` | Placeholder, disabled |
| `--color-text-on-dark` | `#FFFFFF` | Teks di background gelap |
| `--color-text-on-primary` | `#1C1C1E` | Teks di background lime |

### Warna Semantik

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-success` | `#34C759` | Pemasukan, sukses |
| `--color-danger` | `#FF3B30` | Pengeluaran, error, peringatan kritis |
| `--color-warning` | `#FF9500` | Warning, mendekati limit |
| `--color-info` | `#5AC8FA` | Informasi |

### Warna Kategori Default

| Kategori | Hex | Preview |
|---|---|---|
| Makanan | `#FF6B6B` | 🔴 |
| Transportasi | `#45B7D1` | 🔵 |
| Belanja | `#DDA0DD` | 🟣 |
| Hiburan | `#96CEB4` | 🟢 |
| Kesehatan | `#FF2D55` | 🔴 |
| Pendidikan | `#5AC8FA` | 🔵 |
| Tagihan | `#FFEAA7` | 🟡 |
| Rumah Tangga | `#98D8C8` | 🟢 |
| Pakaian | `#AF52DE` | 🟣 |
| Olahraga | `#4ECDC4` | 🟢 |
| Langganan | `#FF9500` | 🟠 |

---

## Typography

### Font Family
- **Primary**: `Inter` (Google Fonts)
- **Monospace**: `JetBrains Mono` (untuk angka/kode)

### Font Sizes

| Token | Size | Penggunaan |
|---|---|---|
| `--text-xs` | 12px | Label kecil, badge, metadata |
| `--text-sm` | 14px | Body text, tabel |
| `--text-base` | 16px | Default body |
| `--text-lg` | 18px | Sub-heading |
| `--text-xl` | 20px | Heading kecil |
| `--text-2xl` | 24px | Section heading |
| `--text-3xl` | 30px | Page heading |
| `--text-4xl` | 36px | Saldo (desktop) |
| `--text-5xl` | 48px | Saldo besar (mobile) |

### Font Weights
- `300` Light
- `400` Regular
- `500` Medium
- `600` Semibold
- `700` Bold
- `800` Extrabold (saldo, angka besar)

---

## Spacing

Menggunakan skala 4px:

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |

---

## Border Radius

| Token | Value | Penggunaan |
|---|---|---|
| `--radius-sm` | 8px | Small elements, badges |
| `--radius-md` | 12px | Buttons, inputs |
| `--radius-lg` | 16px | Cards |
| `--radius-xl` | 20px | Large cards |
| `--radius-2xl` | 24px | Modal, sheet |
| `--radius-full` | 9999px | Avatar, pills |

---

## Shadows

| Token | Penggunaan |
|---|---|
| `--shadow-sm` | Subtle card elevation |
| `--shadow-md` | Dropdown, popover |
| `--shadow-lg` | Modal, elevated cards |
| `--shadow-primary` | Hover pada tombol lime |
| `--shadow-dark` | Hover pada tombol dark |

---

## Komponen UI

### Button Variants
1. **Primary** (lime green) — aksi utama
2. **Dark** — aksi sekunder penting
3. **Secondary** (abu-abu) — aksi biasa
4. **Ghost** — transparent, aksi minor
5. **Outline** — bordered
6. **Danger** (merah) — hapus, keluar

### Card Variants
1. **Default** (putih) — card standar
2. **Primary** (lime) — highlight card (saldo)
3. **Dark** (gelap) — card kontras
4. **Glass** (blur) — glassmorphism effect

### Modal
- Desktop: centered modal dengan backdrop blur
- Mobile: bottom sheet dengan handle dan spring animation

---

## Animasi

### GSAP
- Stagger fade-in untuk list items
- Count-up animation untuk angka saldo
- Bar chart grow animation
- Progress bar fill

### Framer Motion
- Page transitions (fade + slide)
- Modal/Sheet open-close
- Active navigation indicator (layoutId)
- Button hover/tap effects

### CSS Animations
- Skeleton shimmer loading
- Pulse notification badge
- Spin loading spinner
- Ripple button effect
