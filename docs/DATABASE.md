# Fundly.id — Dokumentasi Database

## Gambaran Umum

Database Fundly.id menggunakan **PostgreSQL** yang dihosting di **Supabase**. Semua tabel dilindungi oleh Row Level Security (RLS) sehingga user hanya bisa mengakses data miliknya sendiri.

## Konvensi

- **ID**: Semua primary key menggunakan UUID (`gen_random_uuid()`)
- **Nominal**: Disimpan dalam **sen** (satuan terkecil), bagi 100 untuk tampilkan rupiah
  - Contoh: Rp 1.200.000 = `120000000` sen
- **Waktu**: Menggunakan `TIMESTAMPTZ` (timezone-aware)
- **Soft Delete**: Belum diimplementasi, menggunakan hard delete

## Entity Relationship

```
profiles ─┬─ accounts ──── transactions ─── transaction_tags ─── tags
           │                     │
           ├─ categories ────────┤
           │      │              │
           │  sub_categories     │
           │                     │
           ├─ budgets            │
           │                     │
           ├─ goals              │
           │                     │
           └─ recurring_templates┘
```

## Tabel

### 1. profiles
Ekstensi dari `auth.users` Supabase. Dibuat otomatis saat user signup.

| Kolom | Tipe | Default | Keterangan |
|---|---|---|---|
| id | UUID PK | - | Sama dengan auth.users.id |
| full_name | TEXT | NULL | Nama lengkap |
| avatar_url | TEXT | NULL | URL foto profil |
| currency | TEXT | 'IDR' | Mata uang default |

### 2. accounts
Akun keuangan (kas, bank, e-wallet, kartu kredit).

| Kolom | Tipe | Default | Keterangan |
|---|---|---|---|
| id | UUID PK | auto | - |
| user_id | UUID FK | - | Pemilik akun |
| name | TEXT | - | Nama akun (BCA, GoPay, dll) |
| type | TEXT | - | cash/bank/ewallet/credit_card |
| icon | TEXT | 'wallet' | Nama ikon Lucide |
| color | TEXT | '#C6E83B' | Warna akun |
| balance | BIGINT | 0 | Saldo dalam sen |
| is_active | BOOLEAN | true | Aktif/arsip |
| sort_order | INT | 0 | Urutan tampilan |

### 3. categories
Kategori transaksi (bawaan + kustom).

| Kolom | Tipe | Default | Keterangan |
|---|---|---|---|
| id | UUID PK | auto | - |
| user_id | UUID FK | - | Pemilik |
| name | TEXT | - | Nama kategori |
| icon | TEXT | 'tag' | Nama ikon Lucide |
| color | TEXT | '#6E6E73' | Warna kategori |
| type | TEXT | - | income/expense |
| is_default | BOOLEAN | false | Bawaan sistem |

### 4. transactions
Inti aplikasi — catatan pemasukan, pengeluaran, dan transfer.

| Kolom | Tipe | Default | Keterangan |
|---|---|---|---|
| id | UUID PK | auto | - |
| user_id | UUID FK | - | Pemilik |
| account_id | UUID FK | - | Akun sumber |
| to_account_id | UUID FK | NULL | Akun tujuan (transfer) |
| category_id | UUID FK | - | Kategori |
| sub_category_id | UUID FK | NULL | Sub-kategori opsional |
| recurring_id | UUID FK | NULL | Template recurring asal |
| type | TEXT | - | income/expense/transfer |
| amount | BIGINT | - | Nominal dalam sen |
| note | TEXT | NULL | Catatan bebas |
| location | TEXT | NULL | Lokasi opsional |
| receipt_url | TEXT | NULL | URL foto struk |
| status | TEXT | 'cleared' | cleared/pending |
| transaction_date | DATE | today | Tanggal transaksi |
| transaction_time | TIME | now | Jam transaksi |

### 5. budgets
Budget bulanan per kategori.

| Kolom | Tipe | Keterangan |
|---|---|---|
| category_id | UUID FK | Kategori yang dibudget |
| amount_limit | BIGINT | Batas dalam sen |
| month | INT | Bulan (1-12) |
| year | INT | Tahun |

### 6. goals
Target tabungan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| name | TEXT | Nama target |
| target_amount | BIGINT | Target dalam sen |
| current_amount | BIGINT | Progress saat ini |
| deadline | DATE | Deadline opsional |

### 7. recurring_templates
Template transaksi berulang.

| Kolom | Tipe | Keterangan |
|---|---|---|
| frequency | TEXT | daily/weekly/monthly/yearly |
| day_of_month | INT | Tanggal (untuk monthly) |
| day_of_week | INT | Hari (untuk weekly, 0=Minggu) |
| start_date | DATE | Mulai dari |
| end_date | DATE | Berakhir di (opsional) |
| is_active | BOOLEAN | Status aktif |

## Row Level Security (RLS)

Semua tabel menerapkan kebijakan:
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`
- `DELETE`: `auth.uid() = user_id`

Sub-tabel (sub_categories, transaction_tags) mengecek kepemilikan melalui tabel parent.

## Cara Setup

1. Buat project di [supabase.com](https://supabase.com)
2. Buka SQL Editor
3. Jalankan `sql/001_create_all_tables.sql`
4. Jalankan `sql/seed.sql` (opsional, untuk function seed kategori)
5. Copy URL dan Anon Key ke `.env`
