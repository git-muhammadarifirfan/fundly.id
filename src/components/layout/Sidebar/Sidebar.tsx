// ============================================
// Fundly.id — Sidebar Component (Desktop)
// ============================================

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from '../../../config/routes';
import { APP_NAME } from '../../../config/constants';
import { cn } from '../../../utils/cn';
import styles from './Sidebar.module.css';

// Dynamic icon renderer
const DynamicIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 20 }) => {
  const iconName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') as keyof typeof Icons;
  const IconComponent = Icons[iconName] as React.FC<{ size?: number }>;
  return IconComponent ? <IconComponent size={size} /> : null;
};

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Icons.Wallet size={24} />
        </div>
        <span className={styles.logoText}>{APP_NAME}</span>
      </div>

      {/* Main Navigation */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(styles.navItem, isActive && styles.active)}
                >
                  <span className={styles.navIconWrap}>
                    <DynamicIcon name={item.icon} size={20} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className={styles.bottomNav}>
        <ul className={styles.navList}>
          {SECONDARY_NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(styles.navItem, isActive && styles.active)}
                >
                  <span className={styles.navIconWrap}>
                    <DynamicIcon name={item.icon} size={20} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};
