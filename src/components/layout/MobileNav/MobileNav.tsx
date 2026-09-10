// ============================================
// Fundly.id — Flat Mobile Navigation with Bubble Indicator
// ============================================

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, Plus, BarChart3, Wallet } from 'lucide-react';
import { ROUTES } from '../../../config/routes';
import { cn } from '../../../utils/cn';
import styles from './MobileNav.module.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Beranda', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { id: 'transactions', label: 'Transaksi', path: ROUTES.TRANSACTIONS, icon: ArrowLeftRight },
  { id: 'add', label: 'Tambah', path: ROUTES.ADD_TRANSACTION, icon: Plus, isAdd: true },
  { id: 'reports', label: 'Laporan', path: ROUTES.REPORTS, icon: BarChart3 },
  { id: 'budget', label: 'Anggaran & Target', path: ROUTES.BUDGET, icon: Wallet },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();

  // Find active index (0 to 4) with exact match precedence
  const activeIndex = NAV_ITEMS.findIndex((item) => {
    if (location.pathname === item.path) return true;
    if (item.path !== '/' && location.pathname.startsWith(item.path)) {
      if (item.path === ROUTES.TRANSACTIONS && location.pathname.startsWith(ROUTES.ADD_TRANSACTION)) {
        return false;
      }
      return true;
    }
    return false;
  });

  const currentIndex = activeIndex === -1 ? 0 : activeIndex;
  const bubbleLeftPercentage = (currentIndex * 20) + 10;

  return (
    <nav className={styles.mobileNav}>
      <div className={styles.navContainer}>
        {/* Dynamic Bubble Indicator (Flat, NO SVG NOTCH, NO GLOW) */}
        <motion.div
          className={styles.activeBubble}
          animate={{ left: `${bubbleLeftPercentage}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />

        {/* Nav Items */}
        {NAV_ITEMS.map((item, index) => {
          const isActive = currentIndex === index;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={cn(styles.navItem, isActive && styles.navItemActive)}
              aria-label={item.label}
              style={{ pointerEvents: 'auto' }}
            >
              <motion.div
                className={styles.iconContainer}
                animate={isActive ? { y: -24 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                style={{ pointerEvents: 'none' }}
              >
                {isActive ? (
                  <Icon size={26} strokeWidth={2.5} color="#000000" />
                ) : (
                  <Icon size={24} strokeWidth={2} color="#FFFFFF" />
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
