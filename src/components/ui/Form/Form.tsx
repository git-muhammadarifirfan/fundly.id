// ============================================
// Fundly.id - Shared Form Controls
// ============================================

import React from 'react';
import { cn } from '../../../utils/cn';
import { formatRupiahInput, parseCurrencyInput } from '../../../utils/formatCurrency';
import { DynamicIcon } from '../../../utils/icons';
import styles from './Form.module.css';

export { styles as formStyles };

interface FieldProps {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  htmlFor?: string;
}

export const Field: React.FC<FieldProps> = ({ label, hint, error, children, htmlFor }) => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={htmlFor}>
      {label}
    </label>
    {children}
    {error ? <span className={styles.error}>{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
  </div>
);

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
}

/** Input nominal Rupiah dengan pemisah ribuan otomatis */
export const MoneyInput: React.FC<MoneyInputProps> = ({ value, onChange, placeholder = '0', id, autoFocus }) => (
  <div className={styles.moneyWrap}>
    <span className={styles.moneyPrefix}>Rp</span>
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={styles.input}
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={value ? formatRupiahInput(value) : ''}
      onChange={(e) => onChange(Math.min(parseCurrencyInput(e.target.value), 999_999_999_999_999))}
    />
  </div>
);

interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accent?: boolean;
}

export function Segmented<T extends string>({ options, value, onChange, accent }: SegmentedProps<T>) {
  return (
    <div className={styles.segmented} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          className={cn(styles.segment, opt.value === value && styles.segmentActive, accent && styles.segmentPrimary)}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface IconPickerProps {
  icons: readonly string[];
  value: string;
  onChange: (icon: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ icons, value, onChange }) => (
  <div className={styles.iconGrid}>
    {icons.map((name) => (
      <button
        key={name}
        type="button"
        aria-label={name}
        className={cn(styles.iconOption, value === name && styles.iconOptionActive)}
        onClick={() => onChange(name)}
      >
        <DynamicIcon name={name} size={18} />
      </button>
    ))}
  </div>
);

interface ColorPickerProps {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ colors, value, onChange }) => (
  <div className={styles.colorRow}>
    {colors.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={`Warna ${c}`}
        className={cn(styles.colorDot, value.toUpperCase() === c.toUpperCase() && styles.colorDotActive)}
        style={{ background: c }}
        onClick={() => onChange(c)}
      />
    ))}
  </div>
);

interface PreviewProps {
  icon: string;
  color: string;
  title: string;
  subtitle?: string;
}

export const ItemPreview: React.FC<PreviewProps> = ({ icon, color, title, subtitle }) => (
  <div className={styles.preview}>
    <div className={styles.previewIcon} style={{ background: `${color}22`, color }}>
      <DynamicIcon name={icon} size={20} />
    </div>
    <div className={styles.previewText}>
      <span className={styles.previewTitle}>{title || 'Nama'}</span>
      {subtitle && <span className={styles.previewSub}>{subtitle}</span>}
    </div>
  </div>
);
