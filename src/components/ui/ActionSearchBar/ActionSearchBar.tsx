// ============================================
// Fundly.id — ActionSearchBar Component (Cmd+K Interactive Search & Quick Actions)
// ============================================

import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import styles from './ActionSearchBar.module.css';

export interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  short?: string;
  end?: string;
  onSelect?: () => void;
}

interface ActionSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  actions?: ActionItem[];
  placeholder?: string;
  className?: string;
}

export const ActionSearchBar: React.FC<ActionSearchBarProps> = ({
  value,
  onChange,
  placeholder = "Cari transaksi, kategori, akun (tekan ⌘K)...",
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.inputWrapper}>
        <Search size={18} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
        />

        {value ? (
          <button
            className={styles.clearBtn}
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            type="button"
            aria-label="Hapus pencarian"
          >
            <X size={14} />
          </button>
        ) : (
          <div className={styles.shortcutBadge}>
            <kbd className={styles.kbd}>⌘K</kbd>
          </div>
        )}
      </div>
    </div>
  );
};
