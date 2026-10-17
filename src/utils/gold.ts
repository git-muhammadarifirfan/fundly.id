// ============================================
// Fundly.id - Perhitungan nilai tabungan emas
// ============================================

import type { GoldBrand, GoldHolding } from '../types/models';
import type { GoldPrice } from '../hooks/useGoldPrice';

export const GOLD_BRANDS: { value: GoldBrand; label: string }[] = [
  { value: 'antam', label: 'LM Antam' },
  { value: 'ubs', label: 'UBS' },
  { value: 'galeri24', label: 'Galeri24' },
  { value: 'digital', label: 'Emas Digital' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const goldBrandLabel = (brand: GoldBrand) => GOLD_BRANDS.find((b) => b.value === brand)?.label ?? 'Emas';

/** Penjualan emas batangan ke Antam di atas Rp10 juta dikenai PPh 22 1,5% (dengan NPWP/NIK terdaftar) */
export const PPH22_THRESHOLD = 10_000_000;
export const PPH22_RATE = 0.015;

/**
 * Harga jual per gram hari ini sesuai jenis emas:
 * - Emas fisik: harga buyback LM Antam (acuan resmi pembelian kembali)
 * - Emas digital: harga spot dunia dalam Rupiah (mendekati harga jual aplikasi emas digital)
 */
export function sellPricePerGram(brand: GoldBrand, price: GoldPrice | null): number | null {
  if (!price) return null;
  if (brand === 'digital') return price.spotPerGram ?? price.buybackPerGram;
  return price.buybackPerGram ?? price.spotPerGram;
}

/** Perkiraan harga beli hari ini untuk berat tertentu (harga LM Antam per pecahan) */
export function antamBuyPriceFor(grams: number, price: GoldPrice | null): number | null {
  if (!price || grams <= 0) return null;
  const exact = price.prices.find((p) => p.gram === grams && p.antam);
  if (exact?.antam) return exact.antam;
  return price.antamSell1g ? Math.round(price.antamSell1g * grams) : null;
}

export interface HoldingValue {
  holding: GoldHolding;
  pricePerGram: number | null;
  value: number | null;
  profit: number | null;
  profitPct: number | null;
  costPerGram: number;
}

export function valueHolding(holding: GoldHolding, price: GoldPrice | null): HoldingValue {
  const pricePerGram = sellPricePerGram(holding.brand, price);
  const value = pricePerGram !== null ? Math.round(pricePerGram * holding.grams) : null;
  const profit = value !== null ? value - holding.purchase_price : null;
  return {
    holding,
    pricePerGram,
    value,
    profit,
    profitPct: profit !== null && holding.purchase_price > 0 ? (profit / holding.purchase_price) * 100 : null,
    costPerGram: holding.grams > 0 ? holding.purchase_price / holding.grams : 0,
  };
}

export interface GoldSummary {
  items: HoldingValue[];
  totalGrams: number;
  totalCost: number;
  totalValue: number | null;
  profit: number | null;
  profitPct: number | null;
  avgCostPerGram: number;
  /** Harga jual rata-rata per gram hari ini (tertimbang berat) */
  avgSellPerGram: number | null;
  /** Kenaikan harga jual yang dibutuhkan agar balik modal (persen), 0 jika sudah untung */
  breakEvenPct: number | null;
  /** Perkiraan PPh 22 jika semua emas fisik dijual hari ini (0 jika di bawah ambang) */
  estimatedTax: number;
  netIfSoldToday: number | null;
}

export function summarizeGold(holdings: GoldHolding[], price: GoldPrice | null): GoldSummary {
  const items = holdings.map((h) => valueHolding(h, price));
  const totalGrams = holdings.reduce((s, h) => s + h.grams, 0);
  const totalCost = holdings.reduce((s, h) => s + h.purchase_price, 0);
  const hasPrice = items.length > 0 && items.every((i) => i.value !== null);
  const totalValue = hasPrice ? items.reduce((s, i) => s + (i.value as number), 0) : null;
  const profit = totalValue !== null ? totalValue - totalCost : null;
  const physicalValue = hasPrice
    ? items.filter((i) => i.holding.brand !== 'digital').reduce((s, i) => s + (i.value as number), 0)
    : 0;
  const estimatedTax = physicalValue > PPH22_THRESHOLD ? Math.round(physicalValue * PPH22_RATE) : 0;
  return {
    items,
    totalGrams,
    totalCost,
    totalValue,
    profit,
    profitPct: profit !== null && totalCost > 0 ? (profit / totalCost) * 100 : null,
    avgCostPerGram: totalGrams > 0 ? totalCost / totalGrams : 0,
    avgSellPerGram: totalValue !== null && totalGrams > 0 ? totalValue / totalGrams : null,
    breakEvenPct: totalValue !== null && totalValue > 0 ? Math.max(0, ((totalCost - totalValue) / totalValue) * 100) : null,
    estimatedTax,
    netIfSoldToday: totalValue !== null ? totalValue - estimatedTax : null,
  };
}

/** Format berat: 1 → "1 gr", 0.5 → "0,5 gr", 2.25 → "2,25 gr" */
export function formatGrams(grams: number): string {
  return `${grams.toLocaleString('id-ID', { maximumFractionDigits: 4 })} gr`;
}

/** Parse input berat yang boleh memakai koma desimal ("2,5" → 2.5) */
export function parseGramsInput(raw: string): number {
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Persen dengan format Indonesia: 12.34 → "+12,3%" */
export function formatPct(pct: number, withSign = true): string {
  const abs = Math.abs(pct).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  if (!withSign) return `${abs}%`;
  return `${pct > 0.05 ? '+' : pct < -0.05 ? '-' : ''}${abs}%`;
}
