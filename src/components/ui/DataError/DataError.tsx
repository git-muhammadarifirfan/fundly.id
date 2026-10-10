// ============================================
// Fundly.id - Data Load Error State
// ============================================

import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { EmptyState } from '../EmptyState/EmptyState';

interface DataErrorProps {
  message?: string | null;
  onRetry: () => void;
}

export const DataError: React.FC<DataErrorProps> = ({ message, onRetry }) => (
  <EmptyState
    icon={CloudOff}
    title="Gagal Memuat Data"
    description={message || 'Data tidak dapat dimuat dari server. Periksa koneksi Anda lalu coba lagi.'}
    actionLabel="Coba Lagi"
    actionIcon={<RefreshCw size={16} />}
    onAction={onRetry}
  />
);
