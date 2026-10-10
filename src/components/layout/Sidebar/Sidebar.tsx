import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  Landmark,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from '../../../config/routes';
import { APP_NAME } from '../../../config/constants';
import { useFinanceStore } from '../../../stores/financeStore';
import { cn } from '../../../utils/cn';
import styles from './Sidebar.module.css';

const NAV_ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'arrow-left-right': ArrowLeftRight,
  wallet: Wallet,
  'bar-chart-3': BarChart3,
  target: Target,
  landmark: Landmark,
  settings: Settings,
};

const NavIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 20 }) => {
  const IconComponent = NAV_ICONS[name];
  return IconComponent ? <IconComponent size={size} /> : null;
};

const SYNC_LABELS = {
  idle: 'Menghubungkan...',
  connecting: 'Menghubungkan...',
  live: 'Tersinkron realtime',
  offline: 'Offline — mencoba ulang',
} as const;

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const realtimeStatus = useFinanceStore((s) => s.realtimeStatus);
  const isRefreshing = useFinanceStore((s) => s.isRefreshing);

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <span className={styles.logoSymbol}>F</span>
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
                    <NavIcon name={item.icon} size={20} />
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
                    <NavIcon name={item.icon} size={20} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className={styles.syncStatus} title="Status sinkronisasi data dengan server">
          <span
            className={cn(
              styles.syncDot,
              realtimeStatus === 'live' && styles.syncDotLive,
              realtimeStatus === 'offline' && styles.syncDotOffline,
            )}
          />
          <span className={styles.syncText}>{SYNC_LABELS[realtimeStatus]}</span>
          {isRefreshing && (
            <span className={styles.syncPill}>
              <RefreshCw size={11} className={styles.spinIcon} /> Sinkron
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
