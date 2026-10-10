// ============================================
// Fundly.id - Reusable Confirmation Dialog
// ============================================

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  icon?: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  icon,
  loading = false,
  onConfirm,
  onClose,
}) => (
  <Modal isOpen={isOpen} onClose={loading ? () => undefined : onClose} size="sm" showClose={false}>
    <div className={styles.content}>
      <div className={variant === 'danger' ? styles.iconDanger : styles.iconPrimary}>
        {icon || <AlertTriangle size={26} />}
      </div>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.desc}>{description}</div>
      <div className={styles.actions}>
        <Button variant="ghost" size="md" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="md" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
