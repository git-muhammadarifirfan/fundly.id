// ============================================
// Fundly.id - Skeleton konten halaman (saat chunk halaman sedang dimuat)
// ============================================

import React from 'react';
import { Skeleton } from './Skeleton';

/** Kerangka umum: judul, deretan kartu ringkas, lalu blok konten utama. */
export const PageSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }} aria-busy="true" aria-label="Memuat halaman">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton width="220px" height="26px" borderRadius="10px" />
      <Skeleton width="320px" height="14px" borderRadius="8px" style={{ maxWidth: '80%' }} />
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height="104px" borderRadius="20px" />
      ))}
    </div>
    <Skeleton height="280px" borderRadius="20px" />
    <Skeleton height="180px" borderRadius="20px" />
  </div>
);
