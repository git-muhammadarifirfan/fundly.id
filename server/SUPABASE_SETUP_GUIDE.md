# 🚀 Panduan Setup Supabase - Fundly.id

Panduan ini menyiapkan database, autentikasi, storage, dan realtime Supabase hingga aplikasi Fundly.id siap dipakai di production.

---

## 1. Buat Proyek Supabase

1. Buka [https://supabase.com](https://supabase.com) → **New Project**.
2. Isi **Name** (`Fundly.id`), **Database Password** (simpan baik-baik), dan **Region** terdekat (mis. **Singapore**).
3. Tunggu 1–2 menit sampai proyek siap.

## 2. Isi File `.env`

Dari **Project Settings → API**, salin **Project URL** dan **anon public key**, lalu buat file `.env` (salin dari `.env.example`):

```env
VITE_SUPABASE_URL=https://xyzcompany.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_AUTH_PROVIDERS=google
```

> Jika `.env` belum diisi, aplikasi menampilkan halaman **"Konfigurasi Belum Lengkap"** (tidak ada mode demo/data palsu).

## 3. Jalankan Skema Database

1. Buka **SQL Editor → New Query**.
2. Salin **seluruh** isi [`server/schema.sql`](./schema.sql), tempel, lalu klik **Run**.

Skema ini **idempotent** - aman dijalankan ulang, dan aman dijalankan di atas skema versi lama. Yang dibuat:

| Komponen | Keterangan |
|---|---|
| Tabel | `profiles`, `accounts`, `categories`, `transactions`, `budgets`, `goals`, `recurring_templates` |
| Saldo otomatis | Trigger `apply_transaction_balance` memperbarui `accounts.balance` saat transaksi dibuat/diubah/dihapus (termasuk transfer antar akun) |
| Validasi | Trigger `validate_transaction` memastikan akun & kategori milik user yang sama, nominal > 0, dan bentuk transfer benar |
| User baru | Trigger `on_auth_user_created` membuat profil + kategori default + akun "Tunai (Cash)" & "Bank" |
| RPC | `ensure_user_setup()`, `process_recurring_transactions(p_today)`, `adjust_goal_amount(goal_id, delta)` |
| Keamanan | Row Level Security di semua tabel - user hanya bisa membaca/menulis datanya sendiri |
| Storage | Bucket `avatars` (publik, maks 2 MB, hanya gambar). User hanya bisa menulis ke folder `<user_id>/` miliknya |
| Realtime | Semua tabel aplikasi ditambahkan ke publikasi `supabase_realtime` |

> Nominal uang disimpan sebagai **Rupiah utuh** (`BIGINT`), bukan sen.

## 4. Konfigurasi Autentikasi

### A. URL Configuration (wajib)
**Authentication → URL Configuration**

- **Site URL**: domain production Anda, mis. `https://fundly.id` (saat development: `http://localhost:5173`).
- **Redirect URLs** - tambahkan untuk setiap domain yang dipakai:
  - `http://localhost:5173/**`
  - `https://fundly.id/**`

Aplikasi memakai redirect berikut:

| Alur | Redirect |
|---|---|
| Konfirmasi email pendaftaran | `/login` |
| Reset password | `/reset-password-confirm` |
| Ganti email | `/settings` |
| Login Google/Facebook/Apple | `/` |

### B. Email Provider
**Authentication → Providers → Email**
- Biarkan **Confirm email** aktif untuk production. Setelah mendaftar, user melihat layar "Konfirmasi Email Anda" dan bisa mengirim ulang email.
- Disarankan mengaktifkan **Secure email change** (konfirmasi di email lama & baru).
- Atur **Minimum password length** ke **8** agar sama dengan validasi aplikasi.

### C. Login Sosial (opsional)
Aktifkan provider di **Authentication → Providers** (Google / Facebook / Apple) dan isi Client ID & Secret dari konsol masing-masing. Lalu set `VITE_AUTH_PROVIDERS` di `.env` sesuai provider yang aktif - tombol yang tidak tercantum tidak ditampilkan.

### D. Template Email
**Authentication → Email Templates** - tempel HTML dari folder `supabase/templates/`:
- **Confirm signup** → `confirm_email.html`
- **Reset Password** → `reset_password_email.html`
- **Change Email Address** → `email_changed.html`

### E. SMTP (sangat disarankan untuk production)
**Project Settings → Authentication → SMTP Settings** - gunakan Resend / SendGrid / Mailgun / SES. SMTP bawaan Supabase dibatasi beberapa email per jam.

## 5. Verifikasi Realtime

**Database → Publications → `supabase_realtime`** - pastikan tabel `accounts`, `categories`, `transactions`, `budgets`, `goals`, `recurring_templates`, dan `profiles` tercentang (skema sudah melakukannya otomatis).

Dengan realtime aktif, perubahan dari tab/perangkat lain langsung tampil. Status koneksi terlihat di sidebar ("Tersinkron realtime") dan di **Pengaturan → Data & Ekspor**. Jika koneksi realtime terputus, aplikasi otomatis menyinkronkan ulang saat terhubung kembali, saat tab kembali aktif, atau saat perangkat online lagi.

## 6. Jalankan & Uji

```bash
pnpm install
pnpm run dev
```

Checklist pengujian:
1. Daftar akun di `/register` → konfirmasi email → masuk.
2. Cek **Table Editor**: `profiles`, `categories` (17 kategori default), dan `accounts` (Tunai & Bank) terisi.
3. Tambah pemasukan & pengeluaran → saldo akun berubah otomatis.
4. Buka aplikasi di dua tab, tambah transaksi di satu tab → tab lain ikut ter-update.
5. Buat transaksi dengan **Ulangi → Bulanan** → transaksi pertama tercatat dan muncul di **Pengaturan → Transaksi Rutin**.

## 7. Deploy Production

1. Build: `pnpm run build` → output di folder `dist/`.
2. Hosting SPA (Vercel / Netlify / Cloudflare Pages): set environment variable yang sama dengan `.env`, dan pastikan semua path diarahkan ke `index.html` (SPA fallback) agar URL seperti `/reset-password-confirm` bisa dibuka langsung.
3. Tambahkan domain production ke **Site URL** dan **Redirect URLs** Supabase.
