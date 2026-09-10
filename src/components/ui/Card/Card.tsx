// ============================================
// Fundly.id — Card Component
// ============================================

import React from 'react';
import { cn } from '../../../utils/cn';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'dark' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        styles.card,
        styles[variant],
        styles[`pad-${padding}`],
        hoverable && styles.hoverable,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Sub-component for card headers
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className,
  ...props
}) => {
  return (
    <div className={cn(styles.cardHeader, className)} {...props}>
      <div className={styles.headerText} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
        <div>
          <h3 className={styles.headerTitle}>{title}</h3>
          {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  );
};
