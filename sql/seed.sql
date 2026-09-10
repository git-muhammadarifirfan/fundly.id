-- ============================================
-- Fundly.id — Seed Data: Kategori Default
-- Jalankan SETELAH user pertama signup
-- Atau masukkan ke function handle_new_user()
-- ============================================

-- Function untuk insert kategori default untuk user baru
CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Kategori Pengeluaran
  INSERT INTO categories (user_id, name, icon, color, type, is_default, sort_order) VALUES
    (p_user_id, 'Makanan & Minuman', 'utensils', '#FF6B6B', 'expense', true, 1),
    (p_user_id, 'Transportasi', 'car', '#45B7D1', 'expense', true, 2),
    (p_user_id, 'Belanja', 'shopping-bag', '#DDA0DD', 'expense', true, 3),
    (p_user_id, 'Hiburan', 'gamepad-2', '#96CEB4', 'expense', true, 4),
    (p_user_id, 'Kesehatan', 'heart-pulse', '#FF2D55', 'expense', true, 5),
    (p_user_id, 'Pendidikan', 'graduation-cap', '#5AC8FA', 'expense', true, 6),
    (p_user_id, 'Tagihan & Utilitas', 'zap', '#FFEAA7', 'expense', true, 7),
    (p_user_id, 'Rumah Tangga', 'home', '#98D8C8', 'expense', true, 8),
    (p_user_id, 'Pakaian', 'shirt', '#AF52DE', 'expense', true, 9),
    (p_user_id, 'Olahraga', 'dumbbell', '#4ECDC4', 'expense', true, 10),
    (p_user_id, 'Langganan', 'repeat', '#FF9500', 'expense', true, 11),
    (p_user_id, 'Lainnya', 'more-horizontal', '#6E6E73', 'expense', true, 12);

  -- Kategori Pemasukan
  INSERT INTO categories (user_id, name, icon, color, type, is_default, sort_order) VALUES
    (p_user_id, 'Gaji', 'briefcase', '#C6E83B', 'income', true, 1),
    (p_user_id, 'Freelance', 'laptop', '#4ECDC4', 'income', true, 2),
    (p_user_id, 'Investasi', 'trending-up', '#45B7D1', 'income', true, 3),
    (p_user_id, 'Bonus', 'gift', '#FF9500', 'income', true, 4),
    (p_user_id, 'Penjualan', 'store', '#96CEB4', 'income', true, 5),
    (p_user_id, 'Lainnya', 'more-horizontal', '#6E6E73', 'income', true, 6);

  -- Akun Default
  INSERT INTO accounts (user_id, name, type, icon, color, balance, sort_order) VALUES
    (p_user_id, 'Kas', 'cash', 'wallet', '#34C759', 0, 1),
    (p_user_id, 'Rekening Bank', 'bank', 'landmark', '#45B7D1', 0, 2);
END;
$$ LANGUAGE plpgsql;
