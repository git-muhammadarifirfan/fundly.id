// ============================================
// Fundly.id - Tabungan Emas (Zustand + Supabase Realtime)
// Dipisah dari financeStore agar fitur emas tidak mengganggu data utama
// (mis. bila tabel gold_holdings belum dibuat di database).
// ============================================

import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, toFriendlyError } from '../lib/supabase';
import type { GoldHolding, GoldHoldingInput } from '../types/models';

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'missing-table';

interface GoldState {
  userId: string | null;
  status: Status;
  error: string | null;
  holdings: GoldHolding[];
  init: (userId: string) => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
  add: (input: GoldHoldingInput) => Promise<GoldHolding>;
  update: (id: string, input: GoldHoldingInput) => Promise<GoldHolding>;
  remove: (id: string) => Promise<void>;
}

const TABLE = 'gold_holdings';
let channel: RealtimeChannel | null = null;

const normalize = (row: Record<string, unknown>): GoldHolding => ({
  ...(row as unknown as GoldHolding),
  grams: Number(row.grams),
  purchase_price: Number(row.purchase_price),
});

const sortHoldings = (rows: GoldHolding[]) =>
  rows.sort((a, b) => b.purchase_date.localeCompare(a.purchase_date) || b.created_at.localeCompare(a.created_at));

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === '42P01' || error.code === 'PGRST205' || /gold_holdings/i.test(error.message || '')));

export const useGoldStore = create<GoldState>((set, get) => {
  const upsert = (row: GoldHolding) => {
    const list = get().holdings.filter((h) => h.id !== row.id);
    list.push(row);
    set({ holdings: sortHoldings(list) });
  };

  const subscribe = (uid: string) => {
    if (channel) supabase.removeChannel(channel);
    channel = supabase
      .channel(`fundly-gold-${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE, filter: `user_id=eq.${uid}` }, (p) =>
        upsert(normalize(p.new as Record<string, unknown>)),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter: `user_id=eq.${uid}` }, (p) =>
        upsert(normalize(p.new as Record<string, unknown>)),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, (p) => {
        const id = (p.old as { id?: string })?.id;
        if (id) set({ holdings: get().holdings.filter((h) => h.id !== id) });
      })
      .subscribe();
  };

  const requireUser = () => {
    const uid = get().userId;
    if (!uid) throw new Error('Sesi tidak valid. Silakan masuk kembali.');
    return uid;
  };

  const validate = (input: GoldHoldingInput) => {
    if (!(input.grams > 0)) throw new Error('Berat emas harus lebih dari 0 gram.');
    if (input.grams > 100000) throw new Error('Berat emas terlalu besar.');
    if (!(input.purchase_price > 0)) throw new Error('Total harga beli harus lebih dari 0.');
  };

  return {
    userId: null,
    status: 'idle',
    error: null,
    holdings: [],

    init: async (userId) => {
      if (get().userId === userId && get().status !== 'idle' && get().status !== 'error') return;
      if (get().userId !== userId) set({ holdings: [] });
      set({ userId, status: get().holdings.length ? 'ready' : 'loading', error: null });
      await get().reload();
      if (get().userId === userId && get().status === 'ready') subscribe(userId);
    },

    reload: async () => {
      const uid = get().userId;
      if (!uid) return;
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', uid)
        .order('purchase_date', { ascending: false })
        .limit(1000);
      if (get().userId !== uid) return;
      if (error) {
        if (isMissingTable(error)) set({ status: 'missing-table', error: null });
        else set({ status: 'error', error: toFriendlyError(error) });
        return;
      }
      set({ holdings: sortHoldings((data || []).map((r) => normalize(r as Record<string, unknown>))), status: 'ready', error: null });
    },

    reset: () => {
      if (channel) supabase.removeChannel(channel);
      channel = null;
      set({ userId: null, status: 'idle', error: null, holdings: [] });
    },

    add: async (input) => {
      const uid = requireUser();
      validate(input);
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...input, note: input.note?.trim() || null, user_id: uid })
        .select('*')
        .single();
      if (error) throw new Error(toFriendlyError(error));
      const row = normalize(data as Record<string, unknown>);
      upsert(row);
      return row;
    },

    update: async (id, input) => {
      requireUser();
      validate(input);
      const { data, error } = await supabase
        .from(TABLE)
        .update({ ...input, note: input.note?.trim() || null })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(toFriendlyError(error));
      const row = normalize(data as Record<string, unknown>);
      upsert(row);
      return row;
    },

    remove: async (id) => {
      requireUser();
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw new Error(toFriendlyError(error));
      set({ holdings: get().holdings.filter((h) => h.id !== id) });
    },
  };
});
