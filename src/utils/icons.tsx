// ============================================
// Fundly.id — Icon Registry (nama ikon di database → komponen Lucide)
// ============================================

import React from 'react';
import {
  ArrowLeftRight,
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Music,
  PawPrint,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Repeat,
  Shirt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Tag,
  Target,
  TrendingUp,
  TreePalm,
  Utensils,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  'arrow-left-right': ArrowLeftRight,
  baby: Baby,
  banknote: Banknote,
  'book-open': BookOpen,
  briefcase: Briefcase,
  'building-2': Building2,
  bus: Bus,
  car: Car,
  coffee: Coffee,
  'credit-card': CreditCard,
  dumbbell: Dumbbell,
  ellipsis: Ellipsis,
  film: Film,
  fuel: Fuel,
  'gamepad-2': Gamepad2,
  gift: Gift,
  'graduation-cap': GraduationCap,
  'hand-coins': HandCoins,
  'heart-pulse': HeartPulse,
  house: House,
  landmark: Landmark,
  laptop: Laptop,
  music: Music,
  'paw-print': PawPrint,
  'piggy-bank': PiggyBank,
  pill: Pill,
  plane: Plane,
  receipt: Receipt,
  repeat: Repeat,
  shirt: Shirt,
  'shield-check': ShieldCheck,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  smartphone: Smartphone,
  store: Store,
  tag: Tag,
  target: Target,
  'trending-up': TrendingUp,
  'tree-palm': TreePalm,
  utensils: Utensils,
  wallet: Wallet,
  wifi: Wifi,
  zap: Zap,
};

// Alias nama ikon lama (dari seed versi sebelumnya)
const ICON_ALIASES: Record<string, string> = {
  home: 'house',
  'more-horizontal': 'ellipsis',
  palmtree: 'tree-palm',
  heart: 'heart-pulse',
};

export const CATEGORY_ICON_OPTIONS = [
  'utensils', 'coffee', 'shopping-bag', 'shopping-cart', 'car', 'bus', 'fuel', 'plane',
  'house', 'zap', 'wifi', 'smartphone', 'receipt', 'repeat', 'heart-pulse', 'pill',
  'graduation-cap', 'book-open', 'gamepad-2', 'film', 'music', 'shirt', 'dumbbell', 'baby',
  'paw-print', 'gift', 'hand-coins', 'briefcase', 'laptop', 'store', 'trending-up', 'piggy-bank',
  'tag', 'ellipsis',
] as const;

export const ACCOUNT_ICON_OPTIONS = ['wallet', 'banknote', 'landmark', 'building-2', 'smartphone', 'credit-card', 'piggy-bank'] as const;

export const GOAL_ICON_OPTIONS = ['target', 'shield-check', 'house', 'car', 'plane', 'tree-palm', 'graduation-cap', 'laptop', 'smartphone', 'baby', 'gift', 'piggy-bank'] as const;

export const COLOR_OPTIONS = [
  '#C6E83B', '#34C759', '#4ECDC4', '#45B7D1', '#5AC8FA', '#AF52DE',
  '#DDA0DD', '#FF2D55', '#FF6B6B', '#FF9500', '#FFB020', '#6E6E73',
] as const;

export function getIcon(name: string | null | undefined, fallback: LucideIcon = Tag): LucideIcon {
  if (!name) return fallback;
  const key = ICON_ALIASES[name] || name;
  return ICON_REGISTRY[key] || fallback;
}

interface DynamicIconProps {
  name: string | null | undefined;
  size?: number;
  color?: string;
  className?: string;
  fallback?: LucideIcon;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, size = 18, color, className, fallback }) =>
  React.createElement(getIcon(name, fallback), { size, color, className });

/** Warna teks yang aman dibaca di atas latar warna kategori (hindari putih di atas lime). */
export function readableIconColor(color: string): string {
  return color.toUpperCase() === '#1C1C1E' ? 'var(--color-text-primary)' : color;
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: 'Tunai',
  bank: 'Bank',
  ewallet: 'E-Wallet',
  credit_card: 'Kartu Kredit',
};

export const DEFAULT_ACCOUNT_ICONS: Record<string, string> = {
  cash: 'wallet',
  bank: 'landmark',
  ewallet: 'smartphone',
  credit_card: 'credit-card',
};
