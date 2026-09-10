// ============================================
// Fundly.id — NumPad Component (Mobile)
// ============================================

import React, { useCallback } from 'react';
import { Delete } from 'lucide-react';
import { cn } from '../../../utils/cn';
import styles from './NumPad.module.css';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'delete'],
] as const;

const SUB_LABELS: Record<string, string> = {
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
};

export const NumPad: React.FC<NumPadProps> = ({
  value,
  onChange,
  maxLength = 12,
  className,
}) => {
  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === 'delete') {
        onChange(value.slice(0, -1));
      } else if (key === '') {
        return;
      } else {
        if (value.length < maxLength) {
          // Prevent leading zeros
          const newValue = value === '0' ? key : value + key;
          onChange(newValue);
        }
      }
    },
    [value, onChange, maxLength],
  );

  return (
    <div className={cn(styles.numpad, className)}>
      {KEYS.map((row, rowIdx) => (
        <div key={rowIdx} className={styles.row}>
          {row.map((key) => (
            <button
              key={key || `empty-${rowIdx}`}
              className={cn(
                styles.key,
                key === '' && styles.empty,
                key === 'delete' && styles.deleteKey,
              )}
              onClick={() => handleKeyPress(key)}
              disabled={key === ''}
              type="button"
              aria-label={key === 'delete' ? 'Hapus' : key}
            >
              {key === 'delete' ? (
                <Delete size={24} />
              ) : (
                <div className={styles.keyContent}>
                  <span className={styles.keyNumber}>{key}</span>
                  {SUB_LABELS[key] && (
                    <span className={styles.keyLabel}>{SUB_LABELS[key]}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
