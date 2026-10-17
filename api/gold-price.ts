// ============================================
// Fundly.id - Harga emas hari ini (Vercel Function)
// Sumber utama: harga-emas.org (harga LM Antam, buyback Antam, spot dunia dalam IDR).
// Cadangan: harga spot XAU/USD (gold-api.com) x kurs USD/IDR (open.er-api.com).
// Hasil di-cache di CDN Vercel agar cepat & tidak membebani sumber.
// ============================================

const SOURCE_URL = 'https://harga-emas.org/';
const TROY_OUNCE_GRAMS = 31.1034768;
const UA = 'Mozilla/5.0 (compatible; FundlyBot/1.0; +https://fundlyid.vercel.app)';

export interface GoldPriceRow {
  gram: number;
  antam: number | null;
  pegadaian: number | null;
}

export interface GoldPriceResponse {
  source: 'harga-emas.org' | 'spot';
  sourceUrl: string;
  fetchedAt: string;
  /** Harga buyback (pembelian kembali) LM Antam per gram, Rupiah */
  buybackPerGram: number | null;
  /** Harga jual LM Antam 1 gram (harga beli bagi konsumen), Rupiah */
  antamSell1g: number | null;
  /** Harga spot emas dunia per gram dalam Rupiah */
  spotPerGram: number | null;
  /** Keterangan waktu update harga Antam dari sumber, mis. "17 Oktober 2026 pukul 01.01" */
  antamUpdatedLabel: string | null;
  prices: GoldPriceRow[];
}

const toInt = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
};

/** "2.417.773,43" -> 2417773.43 */
const toIdrDecimal = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

export function parseHargaEmas(html: string): Omit<GoldPriceResponse, 'source' | 'sourceUrl' | 'fetchedAt'> {
  const text = htmlToText(html);

  const buybackPerGram = toInt(text.match(/Harga pembelian kembali:\s*Rp\s*([\d.]+)/i)?.[1]);
  const antamUpdatedLabel = text.match(/Update harga LM Antam:\s*(.+?)\s*(?:Harga pembelian|Update harga|$)/i)?.[1]?.trim() || null;

  // Spot dunia: "Gram (gr) 133,93 (+0,49) 2.417.773,43 (+12.341,13)"
  const spot = text.match(/Gram \(gr\)\s*[\d.,]+\s*(?:\([^)]*\))?\s*([\d.,]+)/i);
  const spotPerGram = toIdrDecimal(spot?.[1]);

  // Tabel pecahan: "<gram> <harga antam> <harga pegadaian>" di antara header & catatan update
  const prices: GoldPriceRow[] = [];
  const start = text.search(/per Gram \(Rp\)\s*per Gram \(Rp\)/i);
  const end = text.search(/Update harga LM Antam/i);
  if (start >= 0 && end > start) {
    const tokens = text
      .slice(start, end)
      .replace(/per Gram \(Rp\)/gi, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    for (let i = 0; i + 2 < tokens.length; i += 3) {
      const gram = Number(tokens[i]);
      if (!Number.isFinite(gram) || gram <= 0) break;
      prices.push({ gram, antam: toInt(tokens[i + 1]), pegadaian: toInt(tokens[i + 2]) });
    }
  }
  const antamSell1g = prices.find((p) => p.gram === 1)?.antam ?? null;

  return { buybackPerGram, antamSell1g, spotPerGram, antamUpdatedLabel, prices };
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json' }, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSpotFallback(): Promise<number | null> {
  try {
    const [goldRes, fxRes] = await Promise.all([
      fetchWithTimeout('https://api.gold-api.com/price/XAU'),
      fetchWithTimeout('https://open.er-api.com/v6/latest/USD'),
    ]);
    if (!goldRes.ok || !fxRes.ok) return null;
    const gold = (await goldRes.json()) as { price?: number };
    const fx = (await fxRes.json()) as { rates?: Record<string, number> };
    const usdPerOz = Number(gold.price);
    const idrPerUsd = Number(fx.rates?.IDR);
    if (!usdPerOz || !idrPerUsd) return null;
    return Math.round((usdPerOz / TROY_OUNCE_GRAMS) * idrPerUsd);
  } catch {
    return null;
  }
}

export async function getGoldPrice(): Promise<GoldPriceResponse> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetchWithTimeout(SOURCE_URL);
    if (res.ok) {
      const parsed = parseHargaEmas(await res.text());
      // Validasi kewajaran agar perubahan tata letak sumber tidak menghasilkan angka ngawur
      const sane = (n: number | null) => n !== null && n > 100_000 && n < 100_000_000;
      if (sane(parsed.buybackPerGram) || sane(parsed.spotPerGram)) {
        return {
          source: 'harga-emas.org',
          sourceUrl: SOURCE_URL,
          fetchedAt,
          ...parsed,
          buybackPerGram: sane(parsed.buybackPerGram) ? parsed.buybackPerGram : null,
          spotPerGram: sane(parsed.spotPerGram) ? Math.round(parsed.spotPerGram as number) : null,
        };
      }
    }
  } catch {
    // lanjut ke cadangan
  }

  const spotPerGram = await fetchSpotFallback();
  return {
    source: 'spot',
    sourceUrl: 'https://gold-api.com',
    fetchedAt,
    buybackPerGram: null,
    antamSell1g: null,
    spotPerGram,
    antamUpdatedLabel: null,
    prices: [],
  };
}

export async function GET(): Promise<Response> {
  const data = await getGoldPrice();
  const ok = data.buybackPerGram !== null || data.spotPerGram !== null;
  return new Response(JSON.stringify(data), {
    status: ok ? 200 : 502,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Cache CDN 10 menit, sajikan versi lama hingga 1 jam sambil memperbarui di latar belakang
      'Cache-Control': ok ? 'public, s-maxage=600, stale-while-revalidate=3600' : 'no-store',
    },
  });
}
