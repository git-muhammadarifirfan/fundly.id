// ============================================
// Fundly.id — Reusable Custom SelectDropdown Component
// Modern Template-Consistent Dropdown with Smooth Animation
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import styles from './SelectDropdown.module.css';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  prefixLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  options,
  value,
  onChange,
  prefixLabel = '',
  icon,
  className = '',
  fullWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={cn(styles.container, fullWidth ? styles.fullWidth : '', className)}
    >
      <button
        type="button"
        className={cn(styles.trigger, isOpen ? styles.triggerOpen : '')}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.triggerContent}>
          {icon && <span className={styles.iconWrap}>{icon}</span>}
          {selectedOption?.icon && <selectedOption.icon size={16} className={styles.iconWrap} />}
          <span className={styles.label}>
            {prefixLabel ? `${prefixLabel}: ` : ''}
            {selectedOption?.label}
          </span>
        </div>
        <ChevronDown size={14} className={cn(styles.chevron, isOpen ? styles.chevronRotate : '')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.menu}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(styles.option, isSelected ? styles.optionActive : '')}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <div className={styles.optionLeft}>
                    {OptIcon && <OptIcon size={16} />}
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className={styles.checkIcon} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper cn
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
