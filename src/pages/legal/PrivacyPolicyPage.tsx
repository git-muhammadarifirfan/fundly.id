// ============================================
// Fundly.id — Kebijakan Privasi
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';
import { LegalLayout, type LegalSection } from './LegalLayout';
import { APP_URL, SUPPORT_EMAIL } from '../../config/constants';
import { ROUTES } from '../../config/routes';

const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

const sections: LegalSection[] = [
  {
    id: 'data-dikumpulkan',
    title: 'Data yang Kami Kumpulkan',
    body: (
      <>
        <p>Kami hanya mengumpulkan data yang diperlukan untuk menjalankan layanan pencatatan keuangan:</p>
        <ul>
          <li>
            <strong>Data akun:</strong> nama lengkap, alamat email, foto profil (jika Anda unggah atau berasal dari akun Google
            Anda), dan kata sandi yang disimpan dalam bentuk ter-hash (kami tidak pernah dapat melihat kata sandi Anda).
          </li>
          <li>
            <strong>Data keuangan yang Anda catat sendiri:</strong> akun/dompet beserta saldonya, transaksi (nominal, tanggal,
            jam, kategori, catatan), kategori, anggaran, target tabungan, dan transaksi rutin.
          </li>
          <li>
            <strong>Data teknis:</strong> token sesi login yang disimpan di browser Anda, serta log teknis standar (misalnya
            alamat IP dan jenis perangkat) yang dicatat oleh penyedia infrastruktur kami untuk keamanan.
          </li>
        </ul>
        <p>
          Fundly.id <strong>tidak</strong> terhubung ke rekening bank, e-wallet, atau kartu kredit Anda dan tidak pernah meminta
          PIN, nomor kartu, atau kredensial perbankan. Seluruh data keuangan dicatat secara manual oleh Anda.
        </p>
      </>
    ),
  },
  {
    id: 'login-google',
    title: 'Login dengan Google',
    body: (
      <>
        <p>
          Jika Anda masuk menggunakan Google, kami hanya menerima <strong>nama, alamat email, dan foto profil</strong> Anda dari
          Google (cakupan <em>openid</em>, <em>email</em>, dan <em>profile</em>). Kami tidak mengakses Gmail, Google Drive,
          kontak, atau data Google lainnya.
        </p>
        <p>
          Penggunaan dan pengiriman informasi yang diterima dari Google API oleh Fundly.id mematuhi{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Kebijakan Data Pengguna Layanan Google API
          </a>
          , termasuk persyaratan Penggunaan Terbatas (<em>Limited Use</em>). Data tersebut hanya dipakai untuk membuat dan
          mengelola akun Anda, tidak dijual, dan tidak digunakan untuk iklan.
        </p>
      </>
    ),
  },
  {
    id: 'penggunaan-data',
    title: 'Bagaimana Kami Menggunakan Data',
    body: (
      <ul>
        <li>Menyediakan fitur pencatatan, saldo otomatis, anggaran, target tabungan, laporan, dan ekspor data.</li>
        <li>Mengautentikasi Anda dan menjaga keamanan akun.</li>
        <li>Menyinkronkan data Anda secara realtime di seluruh perangkat yang Anda gunakan.</li>
        <li>Mengirim email layanan seperti konfirmasi pendaftaran, reset kata sandi, dan perubahan email.</li>
        <li>Menampilkan pengingat di dalam aplikasi, misalnya anggaran yang hampir habis atau tagihan rutin.</li>
      </ul>
    ),
  },
  {
    id: 'berbagi-data',
    title: 'Berbagi Data dengan Pihak Ketiga',
    body: (
      <>
        <p>
          Kami <strong>tidak menjual, menyewakan, atau membagikan</strong> data pribadi maupun data keuangan Anda untuk tujuan
          pemasaran. Data hanya diproses oleh penyedia layanan yang membantu kami menjalankan aplikasi:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — basis data, autentikasi, penyimpanan file (foto profil), dan sinkronisasi realtime.
          </li>
          <li>
            <strong>Penyedia layanan email</strong> — untuk mengirim email konfirmasi dan reset kata sandi.
          </li>
          <li>
            <strong>Google</strong> — hanya jika Anda memilih masuk dengan Google.
          </li>
        </ul>
        <p>Kami dapat mengungkapkan data jika diwajibkan oleh hukum atau perintah otoritas yang berwenang di Indonesia.</p>
      </>
    ),
  },
  {
    id: 'keamanan',
    title: 'Penyimpanan & Keamanan',
    body: (
      <>
        <p>
          Data dikirim melalui koneksi terenkripsi (HTTPS) dan disimpan pada infrastruktur Supabase. Setiap baris data dilindungi
          oleh <em>Row Level Security</em> sehingga hanya akun Anda yang dapat membaca dan mengubah data milik Anda. Kata sandi
          disimpan dalam bentuk ter-hash.
        </p>
        <p>
          Meskipun kami menerapkan langkah keamanan yang wajar, tidak ada sistem yang sepenuhnya bebas risiko. Jaga kerahasiaan
          kata sandi Anda dan segera hubungi kami jika mencurigai akses tidak sah.
        </p>
      </>
    ),
  },
  {
    id: 'penyimpanan-lokal',
    title: 'Cookie & Penyimpanan Lokal',
    body: (
      <p>
        Fundly.id tidak menggunakan cookie iklan atau pelacak pihak ketiga. Kami menggunakan penyimpanan lokal browser
        (<em>localStorage/sessionStorage</em>) untuk menyimpan sesi login (sesuai pilihan "Ingat Saya") dan preferensi kecil
        seperti notifikasi yang sudah dibaca.
      </p>
    ),
  },
  {
    id: 'hak-anda',
    title: 'Hak Anda',
    body: (
      <>
        <p>Sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda berhak untuk:</p>
        <ul>
          <li>Mengakses dan memperbarui data profil Anda melalui menu Pengaturan.</li>
          <li>Mengunduh salinan seluruh transaksi Anda (Excel/CSV) melalui Pengaturan → Data & Ekspor.</li>
          <li>Meminta penghapusan akun beserta seluruh data Anda.</li>
          <li>Menarik persetujuan pemrosesan data dengan berhenti menggunakan layanan dan meminta penghapusan akun.</li>
        </ul>
        <p>Untuk permintaan penghapusan akun atau pertanyaan terkait data, hubungi {mail}.</p>
      </>
    ),
  },
  {
    id: 'retensi',
    title: 'Retensi & Penghapusan Data',
    body: (
      <p>
        Data Anda disimpan selama akun Anda aktif. Setelah permintaan penghapusan akun diverifikasi, akun dan seluruh data
        keuangan Anda akan dihapus permanen dalam waktu paling lambat 30 hari, kecuali jika penyimpanan lebih lama diwajibkan
        oleh hukum.
      </p>
    ),
  },
  {
    id: 'anak',
    title: 'Pengguna di Bawah Umur',
    body: (
      <p>
        Layanan ini ditujukan untuk pengguna berusia 18 tahun ke atas. Pengguna di bawah 18 tahun hanya boleh menggunakan
        Fundly.id dengan persetujuan dan pengawasan orang tua atau wali.
      </p>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan Kebijakan',
    body: (
      <p>
        Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Tanggal pembaruan terakhir selalu tercantum di bagian
        atas halaman. Perubahan yang signifikan akan kami informasikan melalui aplikasi atau email.
      </p>
    ),
  },
  {
    id: 'kontak',
    title: 'Hubungi Kami',
    body: (
      <p>
        Pertanyaan tentang kebijakan ini dapat dikirim ke {mail} atau melalui situs <a href={APP_URL}>{APP_URL.replace(/^https?:\/\//, '')}</a>.
        Baca juga <Link to={ROUTES.TERMS}>Syarat & Ketentuan</Link> kami.
      </p>
    ),
  },
];

export const PrivacyPolicyPage: React.FC = () => (
  <LegalLayout
    badge="Kebijakan Privasi"
    title="Kebijakan Privasi Fundly.id"
    documentTitle="Kebijakan Privasi"
    intro={
      <p>
        Fundly.id adalah aplikasi pencatatan keuangan pribadi. Kami memahami bahwa data keuangan bersifat sensitif. Kebijakan ini
        menjelaskan data apa yang kami kumpulkan, bagaimana data tersebut digunakan dan dilindungi, serta hak-hak Anda atas data
        tersebut.
      </p>
    }
    sections={sections}
  />
);
