// ============================================
// Fundly.id — Supabase Database Types
// ============================================
// Tipe ini bisa di-generate otomatis dari Supabase CLI:
// npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          icon: string;
          color: string;
          balance: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          icon?: string;
          color?: string;
          balance?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          icon?: string;
          color?: string;
          balance?: number;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          type: string;
          is_default: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          type: string;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          color?: string;
          type?: string;
          is_default?: boolean;
          sort_order?: number;
        };
      };
      sub_categories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          category_id?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          to_account_id: string | null;
          category_id: string;
          sub_category_id: string | null;
          recurring_id: string | null;
          type: string;
          amount: number;
          note: string | null;
          location: string | null;
          receipt_url: string | null;
          status: string;
          transaction_date: string;
          transaction_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          to_account_id?: string | null;
          category_id: string;
          sub_category_id?: string | null;
          recurring_id?: string | null;
          type: string;
          amount: number;
          note?: string | null;
          location?: string | null;
          receipt_url?: string | null;
          status?: string;
          transaction_date?: string;
          transaction_time?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          to_account_id?: string | null;
          category_id?: string;
          sub_category_id?: string | null;
          type?: string;
          amount?: number;
          note?: string | null;
          location?: string | null;
          receipt_url?: string | null;
          status?: string;
          transaction_date?: string;
          transaction_time?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
      };
      transaction_tags: {
        Row: {
          transaction_id: string;
          tag_id: string;
        };
        Insert: {
          transaction_id: string;
          tag_id: string;
        };
        Update: {
          transaction_id?: string;
          tag_id?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount_limit: number;
          month: number;
          year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount_limit: number;
          month: number;
          year: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          amount_limit?: number;
          month?: number;
          year?: number;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          target_amount: number;
          current_amount?: number;
          deadline?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          target_amount?: number;
          current_amount?: number;
          deadline?: string | null;
          color?: string;
          updated_at?: string;
        };
      };
      recurring_templates: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string;
          type: string;
          amount: number;
          frequency: string;
          day_of_month: number | null;
          day_of_week: number | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id: string;
          type: string;
          amount: number;
          frequency: string;
          day_of_month?: number | null;
          day_of_week?: number | null;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          category_id?: string;
          type?: string;
          amount?: number;
          frequency?: string;
          day_of_month?: number | null;
          day_of_week?: number | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          note?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
