// ============================================
// Fundly.id - Export Laporan (PDF / Excel / CSV)
// Library berat dimuat secara dinamis hanya saat ekspor.
// ============================================

import type { Account, Category, Transaction } from '../types/models';
import type { CategoryBreakdownItem, DateRangeISO, Totals } from './finance';
import { formatCurrency } from './formatCurrency';
import { formatDate, formatTime, getDayName } from './formatDate';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

export interface ExportPayload {
  title: string;
  periodLabel: string;
  range: DateRangeISO;
  totals: Totals;
  expenseBreakdown: CategoryBreakdownItem[];
  incomeBreakdown: CategoryBreakdownItem[];
  transactions: Transaction[];
  categoriesById: Map<string, Category>;
  accountsById: Map<string, Account>;
  ownerName?: string;
}

const TYPE_LABEL: Record<string, string> = { income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer' };

function rows(payload: ExportPayload) {
  return payload.transactions
    .slice()
    .sort((a, b) =>
      a.transaction_date === b.transaction_date
        ? a.transaction_time.localeCompare(b.transaction_time)
        : a.transaction_date.localeCompare(b.transaction_date),
    )
    .map((tx) => {
      const account = payload.accountsById.get(tx.account_id)?.name || '-';
      const toAccount = tx.to_account_id ? payload.accountsById.get(tx.to_account_id)?.name || '-' : '';
      const category =
        tx.type === 'transfer' ? 'Transfer' : (tx.category_id && payload.categoriesById.get(tx.category_id)?.name) || 'Tanpa Kategori';
      const signed = tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0;
      return {
        tanggal: tx.transaction_date,
        hari: getDayName(tx.transaction_date),
        jam: formatTime(tx.transaction_time),
        jenis: TYPE_LABEL[tx.type],
        kategori: category,
        akun: tx.type === 'transfer' ? `${account} → ${toAccount}` : account,
        catatan: tx.note || '',
        status: tx.status === 'cleared' ? 'Selesai' : 'Tertunda',
        nominal: tx.amount,
        arus: signed,
      };
    });
}

function fileBase(payload: ExportPayload) {
  return `Fundly-Laporan_${payload.range.start}_sd_${payload.range.end}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv(payload: ExportPayload) {
  const data = rows(payload);
  const header = ['Tanggal', 'Hari', 'Jam', 'Jenis', 'Kategori', 'Akun', 'Catatan', 'Status', 'Nominal'];
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    header.join(','),
    ...data.map((r) => [r.tanggal, r.hari, r.jam, r.jenis, r.kategori, r.akun, r.catatan, r.status, r.arus || r.nominal].map(escape).join(',')),
  ];
  // BOM agar Excel membaca UTF-8 dengan benar
  download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), `${fileBase(payload)}.csv`);
}

async function exportXlsx(payload: ExportPayload) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summary = [
    ['Laporan Keuangan Fundly.id'],
    ['Periode', payload.periodLabel],
    ['Rentang', `${formatDate(payload.range.start)} - ${formatDate(payload.range.end)}`],
    [],
    ['Total Pemasukan', payload.totals.income],
    ['Total Pengeluaran', payload.totals.expense],
    ['Selisih (Bersih)', payload.totals.net],
    ['Rasio Tabungan', payload.totals.income > 0 ? `${Math.round((payload.totals.net / payload.totals.income) * 100)}%` : '-'],
    [],
    ['Pengeluaran per Kategori', 'Nominal', 'Persentase', 'Jumlah Transaksi'],
    ...payload.expenseBreakdown.map((c) => [c.name, c.amount, `${c.percentage}%`, c.count]),
    [],
    ['Pemasukan per Kategori', 'Nominal', 'Persentase', 'Jumlah Transaksi'],
    ...payload.incomeBreakdown.map((c) => [c.name, c.amount, `${c.percentage}%`, c.count]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  const data = rows(payload).map((r) => ({
    Tanggal: r.tanggal,
    Hari: r.hari,
    Jam: r.jam,
    Jenis: r.jenis,
    Kategori: r.kategori,
    Akun: r.akun,
    Catatan: r.catatan,
    Status: r.status,
    Nominal: r.arus || r.nominal,
  }));
  const wsTx = XLSX.utils.json_to_sheet(data);
  wsTx['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 7 }, { wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 36 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transaksi');

  XLSX.writeFile(wb, `${fileBase(payload)}.xlsx`);
}

async function exportPdf(payload: ExportPayload) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const lime: [number, number, number] = [198, 232, 59];
  const dark: [number, number, number] = [28, 28, 30];

  // Header
  doc.setFillColor(...lime);
  doc.rect(0, 0, pageWidth, 70, 'F');
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Laporan Keuangan - Fundly.id', 40, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `${payload.periodLabel} (${formatDate(payload.range.start)} - ${formatDate(payload.range.end)})${payload.ownerName ? ` • ${payload.ownerName}` : ''}`,
    40,
    54,
  );

  // Ringkasan
  autoTable(doc, {
    startY: 90,
    head: [['Ringkasan', 'Nominal']],
    body: [
      ['Total Pemasukan', formatCurrency(payload.totals.income)],
      ['Total Pengeluaran', formatCurrency(payload.totals.expense)],
      ['Selisih (Bersih)', formatCurrency(payload.totals.net)],
      [
        'Rasio Tabungan',
        payload.totals.income > 0 ? `${Math.round((payload.totals.net / payload.totals.income) * 100)}%` : '-',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: dark, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;

  if (payload.expenseBreakdown.length) {
    autoTable(doc, {
      startY: lastY() + 20,
      head: [['Pengeluaran per Kategori', 'Nominal', '%', 'Transaksi']],
      body: payload.expenseBreakdown.map((c) => [c.name, formatCurrency(c.amount), `${c.percentage}%`, String(c.count)]),
      theme: 'striped',
      headStyles: { fillColor: lime, textColor: dark },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 40, right: 40 },
    });
  }

  if (payload.incomeBreakdown.length) {
    autoTable(doc, {
      startY: lastY() + 20,
      head: [['Pemasukan per Kategori', 'Nominal', '%', 'Transaksi']],
      body: payload.incomeBreakdown.map((c) => [c.name, formatCurrency(c.amount), `${c.percentage}%`, String(c.count)]),
      theme: 'striped',
      headStyles: { fillColor: lime, textColor: dark },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 40, right: 40 },
    });
  }

  autoTable(doc, {
    startY: lastY() + 20,
    head: [['Tanggal', 'Jam', 'Jenis', 'Kategori', 'Akun', 'Catatan', 'Nominal']],
    body: rows(payload).map((r) => [
      `${r.hari.slice(0, 3)}, ${r.tanggal.split('-').reverse().join('/')}`,
      r.jam,
      r.jenis,
      r.kategori,
      r.akun.replace('→', '->'),
      r.catatan,
      `${r.jenis === 'Pemasukan' ? '+' : r.jenis === 'Pengeluaran' ? '-' : ''}${formatCurrency(r.nominal)}`,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: dark, textColor: [255, 255, 255] },
    columnStyles: { 6: { halign: 'right', cellWidth: 80 }, 5: { cellWidth: 100 } },
    margin: { left: 40, right: 40 },
  });

  // Footer nomor halaman
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Dibuat ${new Date().toLocaleString('id-ID')} • Halaman ${i} dari ${pages}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' },
    );
  }

  doc.save(`${fileBase(payload)}.pdf`);
}

export async function exportReport(format: ExportFormat, payload: ExportPayload): Promise<void> {
  if (format === 'csv') return exportCsv(payload);
  if (format === 'xlsx') return exportXlsx(payload);
  return exportPdf(payload);
}
