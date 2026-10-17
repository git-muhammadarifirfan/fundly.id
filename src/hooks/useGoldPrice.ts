// ============================================
// Fundly.id - Harga emas hari ini (dari /api/gold-price, di-cache di perangkat)
// ============================================

import { useCallback, useEffect, useState } from 'react';

export interface GoldPriceRow {
  gram: number;
  antam: number | null;
  pegadaian: number | null;
}

export interface GoldPrice {
  source: 'harga-emas.org' | 'spot';
  sourceUrl: string;
  fetchedAt: string;
  buybackPerGram: number | null;
  antamSell1g: number | null;
  spotPerGram: number | null;
  antamUpdatedLabel: string | null;
  prices: GoldPriceRow[];
}

const CACHE_KEY = 'fundly-gold-price';
const REFRESH_MS = 15 * 60 * 1000;

const readCache = (): GoldPrice | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as GoldPrice) : null;
  } catch {
    return null;
  }
};

const writeCache = (data: GoldPrice) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // penyimpanan penuh/diblokir: abaikan
  }
};

export function useGoldPrice() {
  const [price, setPrice] = useState<GoldPrice | null>(readCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gold-price', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as GoldPrice;
      if (data.buybackPerGram === null && data.spotPerGram === null) throw new Error('empty');
      setPrice(data);
      writeCache(data);
      setError(null);
    } catch {
      setError('Harga emas terbaru belum bisa dimuat. Menampilkan harga terakhir yang tersimpan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    const stale = !cached || Date.now() - new Date(cached.fetchedAt).getTime() > REFRESH_MS;
    if (stale) void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { price, loading, error, refresh };
}
