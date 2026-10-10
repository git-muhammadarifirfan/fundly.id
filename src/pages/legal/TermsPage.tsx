// ============================================
// Fundly.id - Syarat & Ketentuan Layanan
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, type LegalSection } from './LegalLayout';
import { SUPPORT_EMAIL } from '../../config/constants';
import { ROUTES } from '../../config/routes';

const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

const sections: LegalSection[] = [
  {
    id: 'penerimaan',
    title: 'Penerimaan Syarat',
    body: (
      <p>
        Dengan membuat akun atau menggunakan Fundly.id, Anda menyatakan telah membaca, memahami, dan menyetujui Syarat &
        Ketentuan ini serta <Link to={ROUTES.PRIVACY}>Kebijakan Privasi</Link> kami. Jika Anda tidak setuju, mohon untuk tidak
        menggunakan layanan ini.
      </p>
    ),
  },
  {
    id: 'layanan',
    title: 'Deskripsi Layanan',
    body: (
      <p>
        Fundly.id menyediakan alat untuk mencatat pemasukan, pengeluaran, dan transfer antar akun, mengelola anggaran bulanan,
        memantau target tabungan, mencatat transaksi rutin, serta melihat dan mengekspor laporan keuangan. Fundly.id adalah alat
        pencatatan mandiri dan <strong>tidak</strong> memproses pembayaran, memindahkan uang, maupun terhubung ke rekening bank
        Anda.
      </p>
    ),
  },
  {
    id: 'akun',
    title: 'Akun & Keamanan',
    body: (
      <ul>
        <li>Anda wajib memberikan informasi pendaftaran yang benar dan menjaganya tetap mutakhir.</li>
        <li>Anda bertanggung jawab menjaga kerahasiaan kata sandi dan seluruh aktivitas yang terjadi pada akun Anda.</li>
        <li>Satu akun diperuntukkan bagi satu orang dan tidak boleh dipindahtangankan.</li>
        <li>Segera beri tahu kami melalui {mail} jika Anda mencurigai adanya akses tidak sah.</li>
      </ul>
    ),
  },
  {
    id: 'data-pengguna',
    title: 'Data yang Anda Catat',
    body: (
      <p>
        Seluruh data keuangan yang Anda masukkan tetap menjadi milik Anda. Anda bertanggung jawab atas keakuratan data tersebut.
        Perhitungan saldo, anggaran, dan laporan di Fundly.id sepenuhnya didasarkan pada data yang Anda catat. Anda dapat
        mengekspor data kapan saja melalui menu Laporan atau Pengaturan.
      </p>
    ),
  },
  {
    id: 'bukan-nasihat',
    title: 'Bukan Nasihat Keuangan',
    body: (
      <p>
        Informasi, ringkasan, persentase, dan proyeksi yang ditampilkan Fundly.id (misalnya rasio tabungan atau kebutuhan
        tabungan per bulan) bersifat informatif dan <strong>bukan</strong> nasihat keuangan, investasi, pajak, maupun hukum.
        Keputusan keuangan sepenuhnya menjadi tanggung jawab Anda.
      </p>
    ),
  },
  {
    id: 'penggunaan-dilarang',
    title: 'Penggunaan yang Dilarang',
    body: (
      <>
        <p>Anda setuju untuk tidak:</p>
        <ul>
          <li>Menggunakan layanan untuk kegiatan yang melanggar hukum Republik Indonesia.</li>
          <li>Mencoba mengakses akun atau data milik pengguna lain.</li>
          <li>Mengganggu, membebani secara berlebihan, atau mencoba meretas sistem Fundly.id.</li>
          <li>Melakukan rekayasa balik atau menyalahgunakan layanan untuk tujuan komersial tanpa izin.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'pihak-ketiga',
    title: 'Layanan Pihak Ketiga',
    body: (
      <p>
        Fundly.id menggunakan layanan pihak ketiga seperti Supabase (infrastruktur data) dan Google (login opsional).
        Penggunaan layanan tersebut juga tunduk pada ketentuan masing-masing penyedia. Kami tidak bertanggung jawab atas gangguan
        yang sepenuhnya berasal dari layanan pihak ketiga.
      </p>
    ),
  },
  {
    id: 'ketersediaan',
    title: 'Ketersediaan & Perubahan Layanan',
    body: (
      <p>
        Kami berupaya menjaga layanan tetap tersedia, namun layanan disediakan "sebagaimana adanya" dan dapat sesekali
        terganggu karena pemeliharaan, pembaruan, atau hal di luar kendali kami. Kami dapat menambah, mengubah, atau menghentikan
        fitur dengan pemberitahuan yang wajar.
      </p>
    ),
  },
  {
    id: 'pengakhiran',
    title: 'Pengakhiran Akun',
    body: (
      <p>
        Anda dapat berhenti menggunakan layanan kapan saja dan meminta penghapusan akun melalui {mail}. Kami dapat menangguhkan
        atau menutup akun yang melanggar Syarat & Ketentuan ini. Sebelum akun dihapus, Anda disarankan mengekspor data Anda.
      </p>
    ),
  },
  {
    id: 'tanggung-jawab',
    title: 'Batasan Tanggung Jawab',
    body: (
      <p>
        Sejauh diizinkan oleh hukum yang berlaku, Fundly.id tidak bertanggung jawab atas kerugian tidak langsung, kehilangan
        keuntungan, atau kerugian yang timbul dari keputusan keuangan yang diambil berdasarkan data dalam aplikasi, kesalahan
        pencatatan oleh pengguna, maupun gangguan layanan.
      </p>
    ),
  },
  {
    id: 'hukum',
    title: 'Hukum yang Berlaku',
    body: (
      <p>
        Syarat & Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap perselisihan akan diupayakan diselesaikan secara
        musyawarah terlebih dahulu sebelum menempuh jalur hukum yang berlaku.
      </p>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan Syarat',
    body: (
      <p>
        Kami dapat memperbarui Syarat & Ketentuan ini. Tanggal pembaruan terakhir tercantum di bagian atas halaman. Dengan tetap
        menggunakan layanan setelah perubahan berlaku, Anda dianggap menyetujui syarat yang telah diperbarui.
      </p>
    ),
  },
  {
    id: 'kontak',
    title: 'Hubungi Kami',
    body: <p>Pertanyaan mengenai Syarat & Ketentuan ini dapat dikirim ke {mail}.</p>,
  },
];

export const TermsPage: React.FC = () => (
  <LegalLayout
    badge="Syarat & Ketentuan"
    title="Syarat & Ketentuan Layanan"
    documentTitle="Syarat & Ketentuan"
    intro={
      <p>
        Syarat & Ketentuan ini mengatur penggunaan aplikasi Fundly.id. Mohon dibaca dengan saksama sebelum membuat akun atau
        menggunakan layanan kami.
      </p>
    }
    sections={sections}
  />
);
