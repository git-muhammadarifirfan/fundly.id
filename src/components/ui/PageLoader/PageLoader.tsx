// ============================================
// Fundly.id — Centered Page Loader Component
// ============================================

import React from 'react';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Memuat data Fundly.id...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        height: '100%',
        width: '100%',
        gap: '16px',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          border: '3.5px solid rgba(198, 232, 59, 0.2)',
          borderTopColor: '#C6E83B',
          borderRadius: '50%',
          animation: 'spin 0.65s cubic-bezier(0.4, 0, 0.2, 1) infinite',
          boxShadow: '0 0 16px rgba(198, 232, 59, 0.3)',
        }}
      />
      <span
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary, #6E6E73)',
          fontWeight: '600',
          letterSpacing: '-0.01em',
        }}
      >
        {message}
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

