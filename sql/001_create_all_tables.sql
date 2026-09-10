-- ============================================
-- Fundly.id — SQL Migration: Create All Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Accounts (dompet, rekening, e-wallet, kartu kredit)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'credit_card')),
  icon TEXT NOT NULL DEFAULT 'wallet',
  color TEXT NOT NULL DEFAULT '#C6E83B',
  balance BIGINT NOT NULL DEFAULT 0,  -- dalam sen
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#6E6E73',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user ON categories(user_id);

-- 4. Sub-categories
CREATE TABLE IF NOT EXISTS sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subcategories_category ON sub_categories(category_id);

-- 5. Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#C6E83B',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tags_user ON tags(user_id);

-- 6. Recurring Templates
CREATE TABLE IF NOT EXISTS recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount BIGINT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INT,
  day_of_week INT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_user ON recurring_templates(user_id);

-- 7. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sub_category_id UUID REFERENCES sub_categories(id) ON DELETE SET NULL,
  recurring_id UUID REFERENCES recurring_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount BIGINT NOT NULL,
  note TEXT,
  location TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('cleared', 'pending')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(user_id, type);

-- 8. Transaction Tags (many-to-many)
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

-- 9. Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount_limit BIGINT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month, year)
);

CREATE INDEX idx_budgets_user ON budgets(user_id);

-- 10. Goals (Target Tabungan)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'target',
  target_amount BIGINT NOT NULL,
  current_amount BIGINT NOT NULL DEFAULT 0,
  deadline DATE,
  color TEXT NOT NULL DEFAULT '#C6E83B',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_user ON goals(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;

-- Profiles: users can view/update their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- Categories
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Sub-categories (via parent category ownership)
CREATE POLICY "Users can view own subcategories" ON sub_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM categories c WHERE c.id = sub_categories.category_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can create own subcategories" ON sub_categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM categories c WHERE c.id = sub_categories.category_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update own subcategories" ON sub_categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM categories c WHERE c.id = sub_categories.category_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own subcategories" ON sub_categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM categories c WHERE c.id = sub_categories.category_id AND c.user_id = auth.uid()));

-- Tags
CREATE POLICY "Users can view own tags" ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON tags FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Transaction Tags (via transaction ownership)
CREATE POLICY "Users can view own transaction tags" ON transaction_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_tags.transaction_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can create own transaction tags" ON transaction_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_tags.transaction_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can delete own transaction tags" ON transaction_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_tags.transaction_id AND t.user_id = auth.uid()));

-- Budgets
CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Recurring Templates
CREATE POLICY "Users can view own recurring" ON recurring_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own recurring" ON recurring_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring" ON recurring_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring" ON recurring_templates FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON recurring_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
