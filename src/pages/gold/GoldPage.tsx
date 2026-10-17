// ============================================
// Fundly.id - Tabungan Emas
// Catat emas (gram + total harga beli), lalu lihat nilai jual hari ini
// berdasarkan harga buyback LM Antam / harga spot dalam Rupiah.
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Coins, Plus, Pencil, Trash2, RefreshCw, TrendingUp, TrendingDown, Info, Database } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useGoldStore } from '../../stores/goldStore';
import { useGoldPrice } from '../../hooks/useGoldPrice';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, getTodayISO } from '../../utils/formatDate';
import {
  GOLD_BRANDS,
  PPH22_THRESHOLD,
  antamBuyPriceFor,
  formatGrams,
  formatPct,
  goldBrandLabel,
  parseGramsInput,
  summarizeGold,
} from '../../utils/gold';
import { cn } from '../../utils/cn';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog';
import { Field, MoneyInput, formStyles } from '../../components/ui/Form/Form';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton/Skeleton';
import { DataError } from '../../components/ui/DataError/DataError';
import type { GoldBrand, GoldHolding } from '../../types/models';
import styles from './GoldPage.module.css';

interface GoldForm {
  brand: GoldBrand;
  grams: string;
  price: number;
  date: string;
  note: string;
}

const emptyForm = (): GoldForm => ({ brand: 'antam', grams: '', price: 0, date: getTodayISO(), note: '' });

const profitClass = (n: number | null) => (n === null || n === 0 ? undefined : n > 0 ? styles.up : styles.down);

export const GoldPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const userId = useAuthStore((s) => s.user?.id);
  const status = useGoldStore((s) => s.status);
  const error = useGoldStore((s) => s.error);
  const holdings = useGoldStore((s) => s.holdings);
  const { price, loading: priceLoading, error: priceError, refresh } = useGoldPrice();

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<GoldHolding | null>(null);
  const [form, setForm] = useState<GoldForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<GoldHolding | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userId) void useGoldStore.getState().init(userId);
  }, [userId]);

  const summary = useMemo(() => summarizeGold(holdings, price), [holdings, price]);
  const formGrams = parseGramsInput(form.grams);
  const suggestedPrice = antamBuyPriceFor(formGrams, price);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormMode('create');
  };

  const openEdit = (h: GoldHolding) => {
    setEditing(h);
    setForm({
      brand: h.brand,
      grams: String(h.grams).replace('.', ','),
      price: h.purchase_price,
      date: h.purchase_date,
      note: h.note || '',
    });
    setFormMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const grams = parseGramsInput(form.grams);
    if (!(grams > 0)) {
      toast.error('Isi berat emas dalam gram, misal 1 atau 0,5');
      return;
    }
    if (form.price <= 0) {
      toast.error('Isi total harga beli emas');
      return;
    }
    if (!form.date || form.date > getTodayISO()) {
      toast.error('Tanggal beli tidak valid');
      return;
    }
    const payload = {
      brand: form.brand,
      grams: Math.round(grams * 10000) / 10000,
      purchase_price: form.price,
      purchase_date: form.date,
      note: form.note.trim() || null,
    };
    setIsSaving(true);
    try {
      const store = useGoldStore.getState();
      if (formMode === 'edit' && editing) {
        await store.update(editing.id, payload);
        toast.success('Data emas diperbarui');
      } else {
        await store.add(payload);
        toast.success(`${formatGrams(payload.grams)} emas ditambahkan`);
      }
      setFormMode(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan data emas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await useGoldStore.getState().remove(deleteTarget.id);
      toast.success('Data emas dihapus');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus data emas.');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'error') return <DataError message={error} onRetry={() => void useGoldStore.getState().reload()} />;

  if (status === 'missing-table') {
    return (
      <div className={styles.container}>
        <div className={styles.setupCard}>
          <Database size={20} />
          <div>
            <strong>Fitur Tabungan Emas perlu diaktifkan di database</strong>
            <p>
              Jalankan file <code>server/migrations/20261017_gold_holdings.sql</code> sekali di Supabase SQL Editor, lalu muat
              ulang halaman ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = status === 'loading' || status === 'idle';
  const hasHoldings = holdings.length > 0;
  const spread =
    price?.antamSell1g && price.buybackPerGram ? ((price.antamSell1g - price.buybackPerGram) / price.antamSell1g) * 100 : null;

  return (
    <div className={cn(styles.container, embedded && styles.embedded)}>
      {/* Ringkasan nilai emas hari ini */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryLeft}>
          <div className={styles.summaryBadge}>
            <Coins size={14} /> Tabungan Emas · Nilai Jual Hari Ini
          </div>
          <h2 className={styles.summaryTitle}>
            {hasHoldings && summary.totalValue !== null ? formatCurrency(summary.totalValue) : formatCurrency(0)}
          </h2>
          <p className={styles.summaryDesc}>
            {hasHoldings
              ? `${formatGrams(summary.totalGrams)} · modal ${formatCurrency(summary.totalCost)}`
              : 'Catat emas yang kamu punya untuk melihat nilainya hari ini.'}
          </p>
          {hasHoldings && summary.profit !== null && (
            <span className={cn(styles.profitPill, profitClass(summary.profit))}>
              {summary.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatCurrency(summary.profit, { showSign: true })}
              {summary.profitPct !== null && ` (${formatPct(summary.profitPct)})`}
            </span>
          )}
        </div>
        <div className={styles.summaryRight}>
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openCreate}>
            Tambah Emas
          </Button>
        </div>
      </div>

      {/* Harga emas hari ini */}
      <div className={styles.priceCard}>
        <div className={styles.priceHeader}>
          <span className={styles.priceTitle}>Harga Emas Hari Ini</span>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => void refresh()}
            disabled={priceLoading}
            aria-label="Perbarui harga emas"
          >
            <RefreshCw size={14} className={priceLoading ? styles.spin : undefined} />
          </button>
        </div>
        {!price ? (
          <div className={styles.priceGrid}>
            <Skeleton height="58px" borderRadius="14px" />
            <Skeleton height="58px" borderRadius="14px" />
            <Skeleton height="58px" borderRadius="14px" />
          </div>
        ) : (
          <div className={styles.priceGrid}>
            <div className={styles.priceItem}>
              <span className={styles.priceLabel}>Buyback Antam</span>
              <span className={styles.priceValue}>{price.buybackPerGram ? formatCurrency(price.buybackPerGram) : '-'}</span>
              <span className={styles.priceUnit}>per gram · harga jual kamu</span>
            </div>
            <div className={styles.priceItem}>
              <span className={styles.priceLabel}>Harga Beli Antam</span>
              <span className={styles.priceValue}>{price.antamSell1g ? formatCurrency(price.antamSell1g) : '-'}</span>
              <span className={styles.priceUnit}>pecahan 1 gram</span>
            </div>
            <div className={styles.priceItem}>
              <span className={styles.priceLabel}>Spot Dunia</span>
              <span className={styles.priceValue}>{price.spotPerGram ? formatCurrency(price.spotPerGram) : '-'}</span>
              <span className={styles.priceUnit}>per gram · emas digital</span>
            </div>
          </div>
        )}
        <p className={styles.priceSource}>
          {price?.antamUpdatedLabel ? `Harga Antam ${price.antamUpdatedLabel.split(' pukul')[0]} · ` : ''}
          {price ? `dicek ${new Date(price.fetchedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · ` : ''}
          Sumber{' '}
          <a href={price?.sourceUrl || 'https://harga-emas.org/'} target="_blank" rel="noopener noreferrer">
            {price?.source === 'spot' ? 'gold-api.com (spot)' : 'harga-emas.org'}
          </a>
          {spread !== null && ` · Selisih beli-jual Antam ${formatPct(spread, false)}`}
        </p>
        {priceError && <p className={styles.priceError}>{priceError}</p>}
      </div>

      {/* Analisa jual hari ini */}
      {hasHoldings && summary.totalValue !== null && (
        <div className={styles.analysisCard}>
          <span className={styles.analysisTitle}>Analisa Jika Dijual Hari Ini</span>
          <div className={styles.analysisRows}>
            <div className={styles.analysisRow}>
              <span>Rata-rata harga beli</span>
              <strong>{formatCurrency(summary.avgCostPerGram)}/gr</strong>
            </div>
            <div className={styles.analysisRow}>
              <span>Harga jual hari ini</span>
              <strong>{summary.avgSellPerGram !== null ? `${formatCurrency(summary.avgSellPerGram)}/gr` : '-'}</strong>
            </div>
            <div className={styles.analysisRow}>
              <span>Total diterima (kotor)</span>
              <strong>{formatCurrency(summary.totalValue)}</strong>
            </div>
            {summary.estimatedTax > 0 && (
              <div className={styles.analysisRow}>
                <span>Perkiraan PPh 22 (1,5%)</span>
                <strong className={styles.down}>-{formatCurrency(summary.estimatedTax)}</strong>
              </div>
            )}
            <div className={cn(styles.analysisRow, styles.analysisTotal)}>
              <span>Untung / rugi bersih</span>
              <strong className={profitClass((summary.netIfSoldToday ?? 0) - summary.totalCost)}>
                {formatCurrency((summary.netIfSoldToday ?? 0) - summary.totalCost, { showSign: true })}
              </strong>
            </div>
          </div>
          <p className={cn(styles.verdict, summary.profit !== null && summary.profit >= 0 ? styles.verdictUp : styles.verdictDown)}>
            {summary.profit !== null && summary.profit >= 0
              ? `Emasmu sudah untung ${formatPct(summary.profitPct ?? 0)} dari modal. Kalau dijual hari ini, kamu dapat sekitar ${formatCurrency(summary.netIfSoldToday ?? 0)}.`
              : `Belum balik modal. Harga jual perlu naik sekitar ${formatPct(summary.breakEvenPct ?? 0, false)} (ke ±${formatCurrency(summary.avgCostPerGram)}/gr) agar impas. Emas biasanya cocok disimpan jangka panjang.`}
          </p>
          <p className={styles.footnote}>
            <Info size={12} /> Emas fisik dinilai dengan harga buyback Antam; UBS/Galeri24 di toko bisa sedikit berbeda. Penjualan
            di atas {formatCurrency(PPH22_THRESHOLD, { compact: true })} ke Antam dikenai PPh 22 1,5% (3% tanpa NPWP).
          </p>
        </div>
      )}

      {/* Daftar emas */}
      {isLoading ? (
        <div className={styles.list}>
          <Skeleton height="96px" borderRadius="20px" />
          <Skeleton height="96px" borderRadius="20px" />
        </div>
      ) : !hasHoldings ? (
        <EmptyState
          icon={Coins}
          title="Belum Ada Tabungan Emas"
          description="Catat berat emas (gram) dan total harga belinya. Fundly akan menghitung nilai jualnya setiap hari sesuai harga buyback Antam."
          actionLabel="Tambah Emas Pertama"
          actionIcon={<Plus size={16} />}
          onAction={openCreate}
        />
      ) : (
        <div className={styles.list}>
          {summary.items.map(({ holding: h, value, profit, profitPct, costPerGram }) => (
            <div key={h.id} className={styles.holdingCard}>
              <div className={styles.holdingTop}>
                <div className={styles.holdingIcon}>
                  <Coins size={20} />
                </div>
                <div className={styles.holdingInfo}>
                  <span className={styles.holdingTitle}>
                    {formatGrams(h.grams)} · {goldBrandLabel(h.brand)}
                  </span>
                  <span className={styles.holdingMeta}>
                    Dibeli {formatDate(h.purchase_date, 'd MMM yyyy')}
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => openEdit(h)} aria-label="Edit emas" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button className={styles.iconBtn} onClick={() => setDeleteTarget(h)} aria-label="Hapus emas" title="Hapus">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className={styles.holdingStats}>
                <div>
                  <span className={styles.statLabel}>Harga beli</span>
                  <span className={styles.statValue}>{formatCurrency(h.purchase_price)}</span>
                  <span className={styles.statSub}>{formatCurrency(costPerGram)}/gr</span>
                </div>
                <div>
                  <span className={styles.statLabel}>Nilai hari ini</span>
                  <span className={styles.statValue}>{value !== null ? formatCurrency(value) : '-'}</span>
                  <span className={cn(styles.statSub, profitClass(profit))}>
                    {profit !== null ? formatCurrency(profit, { showSign: true }) : '-'}
                    {profitPct !== null && ` (${formatPct(profitPct)})`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tambah / Edit emas */}
      <Modal
        isOpen={formMode !== null}
        onClose={() => !isSaving && setFormMode(null)}
        size="sm"
        title={formMode === 'edit' ? 'Edit Emas' : 'Tambah Tabungan Emas'}
      >
        <form className={formStyles.form} onSubmit={handleSubmit}>
          <Field label="Jenis Emas">
            <div className={formStyles.chipRow}>
              {GOLD_BRANDS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  className={cn(formStyles.chip, form.brand === b.value && formStyles.chipActive)}
                  onClick={() => setForm({ ...form, brand: b.value })}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Berat (gram)" htmlFor="gold-grams" hint="Boleh desimal, misal 0,5 atau 2,25">
            <input
              id="gold-grams"
              className={formStyles.input}
              inputMode="decimal"
              autoComplete="off"
              placeholder="Misal: 5"
              value={form.grams}
              onChange={(e) => setForm({ ...form, grams: e.target.value.replace(/[^\d.,]/g, '').slice(0, 10) })}
            />
          </Field>

          <Field
            label="Total Harga Beli"
            hint={
              suggestedPrice && form.brand !== 'digital' ? (
                <button type="button" className={styles.suggestBtn} onClick={() => setForm({ ...form, price: suggestedPrice })}>
                  Pakai harga Antam hari ini: {formatCurrency(suggestedPrice)}
                </button>
              ) : formGrams > 0 && form.price > 0 ? (
                `${formatCurrency(form.price / formGrams)}/gram`
              ) : (
                'Total yang kamu bayar untuk emas ini'
              )
            }
          >
            <MoneyInput value={form.price} onChange={(p) => setForm({ ...form, price: p })} />
          </Field>

          <Field label="Tanggal Beli" htmlFor="gold-date">
            <input
              id="gold-date"
              type="date"
              className={formStyles.input}
              max={getTodayISO()}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>

          <Field label="Catatan (opsional)" htmlFor="gold-note">
            <input
              id="gold-note"
              className={formStyles.input}
              placeholder="Misal: Butik Antam Pulogadung"
              maxLength={120}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>

          <div className={formStyles.actions}>
            <Button variant="ghost" size="md" type="button" onClick={() => setFormMode(null)} disabled={isSaving}>
              Batal
            </Button>
            <Button variant="primary" size="md" type="submit" loading={isSaving}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Hapus Data Emas?"
        description={
          deleteTarget ? (
            <>
              Catatan emas <strong>{formatGrams(deleteTarget.grams)}</strong> ({goldBrandLabel(deleteTarget.brand)}) akan dihapus.
            </>
          ) : null
        }
        confirmLabel="Ya, Hapus"
        loading={isSaving}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
