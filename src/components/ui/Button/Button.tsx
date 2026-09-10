// ============================================
// Fundly.id — Button Component
// ============================================

import React from 'react';
import { cn } from '../../../utils/cn';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconRight,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className={styles.spinner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15" />
          </svg>
        </span>
      )}
      {!loading && icon && <span className={styles.icon}>{icon}</span>}
      {children && <span className={styles.label}>{children}</span>}
      {!loading && iconRight && <span className={styles.iconRight}>{iconRight}</span>}
    </button>
  );
};
