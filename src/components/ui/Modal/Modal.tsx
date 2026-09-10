// ============================================
// Fundly.id — Modal Component
// ============================================

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showClose?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className,
}) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.wrapper}>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(styles.modal, styles[size], className)}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {(title || showClose) && (
              <div className={styles.header}>
                {title && <h2 className={styles.title}>{title}</h2>}
                {showClose && (
                  <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Tutup"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            <div className={styles.body}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Sheet variant for mobile (slides from bottom)
interface SheetProps extends Omit<ModalProps, 'size'> {
  height?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showClose = true,
  height = 'auto',
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.wrapper}>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(styles.sheet, className)}
            style={{ maxHeight: height }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.sheetHandle} />
            {(title || showClose) && (
              <div className={styles.header}>
                {title && <h2 className={styles.title}>{title}</h2>}
                {showClose && (
                  <button className={styles.closeButton} onClick={onClose} aria-label="Tutup">
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            <div className={styles.body}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
