# Fundly.id — Dokumentasi Arsitektur

## Gambaran Umum

Fundly.id adalah aplikasi web pencatatan keuangan pribadi yang dibangun menggunakan arsitektur **Single Page Application (SPA)** dengan React TypeScript dan Supabase sebagai backend.

## Stack Teknologi

| Layer | Teknologi | Versi |
|---|---|---|
| Frontend Framework | React + TypeScript | 18.x |
| Build Tool | Vite | 6.x |
| Routing | React Router v6 | 6.28+ |
| State Management | Zustand | 5.x |
| Backend/Database | Supabase (PostgreSQL) | 2.x |
| Animasi | GSAP + Framer Motion | 3.12 / 11.x |
| Charts | Recharts | 2.13+ |
| Form Handling | React Hook Form + Zod | 7.x / 3.x |
| Icons | Lucide React | 0.460+ |
| Date Utilities | date-fns | 4.x |
| Export | xlsx + jspdf | - |
| Styling | Vanilla CSS + CSS Modules | - |

## Arsitektur Aplikasi

```
┌─────────────────────────────────────────────┐
│                 Browser                      │
│  ┌───────────────────────────────────────┐  │
│  │        React SPA (Vite)               │  │
│  │  ┌────────┐ ┌──────┐ ┌───────────┐   │  │
│  │  │ Pages  │ │Hooks │ │Components │   │  │
│  │  └───┬────┘ └──┬───┘ └─────┬─────┘   │  │
│  │      │         │           │          │  │
│  │  ┌───▼─────────▼───────────▼──────┐   │  │
│  │  │       Zustand Stores           │   │  │
│  │  └───────────────┬────────────────┘   │  │
│  │                  │                    │  │
│  │  ┌───────────────▼────────────────┐   │  │
│  │  │      Service Layer             │   │  │
│  │  └───────────────┬────────────────┘   │  │
│  └──────────────────┼────────────────────┘  │
└─────────────────────┼───────────────────────┘
                      │ HTTPS/WSS
┌─────────────────────▼───────────────────────┐
│              Supabase Cloud                  │
│  ┌──────────┐ ┌────────┐ ┌──────────────┐  │
│  │PostgreSQL│ │  Auth  │ │   Storage    │  │
│  │ + RLS    │ │        │ │  (Receipts)  │  │
│  └──────────┘ └────────┘ └──────────────┘  │
└──────────────────────────────────────────────┘
```

## Alur Data

1. **User** berinteraksi dengan **Pages** (komponen halaman)
2. Pages memanggil **Hooks** yang menggunakan **Zustand Stores** untuk state management
3. Hooks memanggil **Services** yang berkomunikasi dengan **Supabase API**
4. Supabase menerapkan **Row Level Security (RLS)** sehingga setiap user hanya bisa akses data miliknya
5. Data dikembalikan ke Store → Hook → Page → ditampilkan ke user

## Struktur Folder

```
src/
├── config/       → Konfigurasi app (supabase client, routes, constants)
├── types/        → TypeScript interfaces dan types
├── hooks/        → Custom React hooks
├── stores/       → Zustand state stores
├── services/     → Layer abstraksi untuk Supabase API calls
├── utils/        → Utility functions (format currency, date, dll)
├── styles/       → Global CSS (design system, animations, responsive)
├── components/   → Reusable components
│   ├── ui/       → Komponen primitif (Button, Card, Modal, NumPad)
│   ├── layout/   → Layout (Sidebar, MobileNav, Header, AppLayout)
│   ├── charts/   → Chart components (Recharts wrapper)
│   └── features/ → Feature-specific components
└── pages/        → Halaman/route (Dashboard, Transactions, Budget, dll)
```

## Responsive Design

- **Mobile (< 768px)**: Bottom navigation, full-width cards, custom numpad, single-column
- **Tablet (768px - 1023px)**: Hybrid layout, 2-column grid
- **Desktop (≥ 1024px)**: Sidebar navigation, multi-column dashboard, table views

## Keamanan

- **Supabase RLS**: Setiap tabel dilindungi Row Level Security
- **Auth**: Supabase Auth dengan JWT tokens
- **Environment Variables**: API keys disimpan di `.env` (gitignored)
- **Data Encryption**: Data sensitif dilindungi oleh Supabase

## Performance

- **Code Splitting**: React lazy loading per route
- **CSS Modules**: Scoped CSS, no unused styles shipped
- **Vite**: Lightning-fast HMR dan optimized production builds
- **GSAP**: Hardware-accelerated animations (transform, opacity)
