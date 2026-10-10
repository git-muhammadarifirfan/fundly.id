// ============================================
// Fundly.id - Clean Empty State Component
// ============================================

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../Button/Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={styles.emptyContainer}
    >
      <div className={styles.iconCircle}>
        <Icon size={32} />
      </div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDesc}>{description}</p>
      {actionLabel && onAction && (
        <div className={styles.actionWrap}>
          <Button
            variant="primary"
            size="md"
            icon={actionIcon}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
};
