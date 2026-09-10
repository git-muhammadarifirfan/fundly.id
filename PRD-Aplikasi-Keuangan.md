# PRD — Aplikasi Pencatatan Keuangan Pribadi (Versi Kompleks)

## 1. Latar Belakang

Kebanyakan aplikasi keuangan pribadi yang serius punya pola yang mirip: mereka tidak hanya mencatat "uang masuk/keluar", tapi mencatat **kapan** (tanggal, hari, jam), **dari/ke akun mana**, **untuk apa**, dan menyimpannya cukup detail sehingga bisa dianalisis, dibudget, dan diprediksi ke depan.

Aplikasi seperti YNAB memakai pendekatan "amplop" — tiap rupiah dialokasikan ke kategori, dan mendukung sinkronisasi lintas perangkat sehingga uang bisa dikelola bersama pasangan atau keluarga, lengkap dengan pelacakan target tabungan, kalkulator pinjaman, serta laporan pengeluaran dan kekayaan bersih. Aplikasi lain seperti Money Manager memakai sistem pembukuan berpasangan (double-entry), di mana saldo akun otomatis bertambah saat pemasukan dicatat dan otomatis berkurang saat pengeluaran dicatat, bukan sekadar angka terpisah — ini yang bikin fitur "multi-akun" jadi solid.

Dokumen ini merangkum fitur dan flow yang biasa dipakai aplikasi-aplikasi tersebut, disusun bertingkat dari dasar sampai kompleks.

## 2. Model Data Transaksi

Ini inti dari aplikasi kompleks — satu transaksi idealnya menyimpan:

| Field | Keterangan |
|---|---|
| Tanggal | Wajib. Default hari ini, bisa diubah untuk backdate |
| Hari | Auto-derive dari tanggal (Senin, Selasa, dst) — tidak perlu diinput manual |
| Jam | Auto-capture saat input, bisa diedit manual |
| Jumlah | Nominal, wajib |
| Jenis | Pemasukan / Pengeluaran / Transfer antar akun |
| Akun | Bukan cuma "cash vs non-cash" — idealnya daftar akun bebas: Cash, Rekening BCA, GoPay, Kartu Kredit, dst. Masing-masing akun punya saldo sendiri |
| Kategori & Sub-kategori | Mis. Makanan → Makan di luar / Belanja dapur |
| Catatan | Teks bebas |
| Tag | Label lintas kategori (mis. "Liburan Bali" bisa dipakai di kategori Transport, Hotel, Makanan sekaligus) |
| Lampiran struk | Foto opsional |
| Lokasi | Opsional, buat tahu pengeluaran itu terjadi di mana |
| Status | Cleared (sudah pasti) / Pending (transaksi terjadwal belum dikonfirmasi) |
| Berulang | Flag + frekuensi, kalau ini transaksi rutin (gaji, tagihan, cicilan) |

Kalau tanggal dan jam dicatat konsisten, pertanyaan "pengeluaran tanggal berapa, hari apa, jam berapa, buat apa" otomatis kejawab dari satu baris data ini — tidak perlu tabel terpisah.

## 3. Fitur, Bertingkat Kompleksitas

### Tier 1 — Dasar (MVP)
- Catat transaksi manual dengan tanggal & jam otomatis
- Multi-akun (bukan biner cash/non-cash, tapi daftar akun bebas dengan saldo masing-masing)
- Transfer antar akun (kategori khusus, tidak masuk hitungan income/expense biar laporan tidak dobel)
- Kategori & sub-kategori bawaan + bisa bikin sendiri
- Riwayat transaksi dengan filter (tanggal, kategori, akun, jenis) & pencarian teks
- Saldo per akun + saldo total

### Tier 2 — Menengah
- Budget bulanan per kategori, dengan indikator progress (aman / mendekati limit / lewat limit)
- Transaksi berulang otomatis (gaji, sewa, cicilan, langganan) dengan tanggal & frekuensi, jadi tidak perlu diinput manual tiap bulan
- Pengingat tagihan (H-3, H-1 sebelum jatuh tempo)
- Laporan bulanan: donut chart per kategori, bar chart per minggu/hari
- Perbandingan bulan ini vs bulan lalu (naik/turun berapa persen per kategori)
- Split transaksi — satu pembayaran dipecah ke beberapa kategori (mis. belanja bulanan berisi makanan + kebutuhan rumah)
- Export ke Excel/CSV/PDF
- Lampiran foto struk untuk tiap transaksi

### Tier 3 — Kompleks / Lanjutan
- Target/goal tabungan dengan proyeksi kapan target tercapai berdasarkan kecepatan menabung
- Pelacak utang-piutang & cicilan berbunga, lengkap jatuh tempo
- Net worth tracker — total aset dikurangi utang, dilihat trennya dari waktu ke waktu
- Insight otomatis, mis. "pengeluaran Hiburan bulan ini naik 20% dibanding rata-rata 3 bulan terakhir"
- Proyeksi arus kas — perkiraan saldo akhir bulan berdasarkan transaksi rutin + rata-rata historis
- Auto-kategorisasi berdasarkan nama merchant/kata kunci catatan
- Multi-currency (kalau ada transaksi luar negeri)
- Berbagi budget dengan pasangan/keluarga, sinkron di beberapa perangkat
- Widget home screen: saldo & pengeluaran hari ini
- Backup otomatis + enkripsi data

## 4. User Flow

### A. Tambah Transaksi (flow paling sering dipakai)
1. Tap tombol tambah dari layar utama
2. Pilih jenis: Pengeluaran / Pemasukan / Transfer
3. Input nominal
4. Pilih akun (Cash / Bank / E-wallet / dst)
5. Pilih kategori — tampilkan kategori yang sering dipakai di baris paling atas
6. Tanggal & jam ter-isi otomatis "sekarang", tinggal diketuk kalau mau diubah (misal mencatat transaksi kemarin)
7. (Opsional) catatan, foto struk, tag
8. Simpan → saldo akun langsung ter-update → langsung muncul di riwayat hari itu, jam segitu

### B. Cek Laporan Bulanan
1. Buka tab Laporan, pilih bulan/rentang tanggal
2. Lihat total masuk vs keluar dan saldo bersih bulan itu
3. Lihat breakdown per kategori (chart) — ketuk satu kategori untuk drill-down ke daftar transaksinya (jadi ketahuan tanggal, hari, jam, dan untuk apa persisnya)
4. Bandingkan dengan bulan sebelumnya
5. Export laporan

### C. Atur Budget
1. Tab Budget → pilih kategori
2. Set limit bulanan
3. Sistem hitung otomatis dari transaksi yang sudah masuk bulan berjalan
4. Notifikasi saat mendekati (sekitar 80%) dan saat melewati limit

### D. Transaksi Berulang
1. Saat tambah transaksi, aktifkan "Ulangi"
2. Pilih frekuensi (harian/mingguan/bulanan/tahunan) dan tanggal berakhir (opsional)
3. Sistem otomatis membuat transaksi baru di tanggal yang sama tiap periode

## 5. Struktur Layar

- **Beranda** — total saldo semua akun, transaksi terbaru, tombol tambah cepat
- **Transaksi** — riwayat lengkap, filter & pencarian
- **Budget** — daftar kategori dengan progress bar
- **Laporan** — chart & perbandingan antar bulan
- **Akun** — kelola daftar dompet/rekening dan saldo masing-masing
- **Pengaturan** — kategori custom, export/backup, mata uang

## 6. Catatan Non-fungsional

- Keamanan data jadi perhatian utama karena sifatnya sensitif — sebaiknya data terenkripsi, dan tidak wajib menghubungkan rekening bank asli supaya pengguna yang tidak nyaman tetap bisa mencatat manual
- Idealnya berjalan offline dan sinkron saat online
- Format export minimal: Excel/CSV, idealnya juga PDF untuk laporan siap cetak
