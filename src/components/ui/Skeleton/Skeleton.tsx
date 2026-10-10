// ============================================
// Fundly.id - Inline Skeleton Loader Component
// ============================================

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {},
}) => {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--color-bg-card-hover, rgba(229, 229, 232, 0.4))',
        animation: 'fundlySkeletonPulse 1.4s ease-in-out infinite',
        ...style,
      }}
    >
      <style>{`
        @keyframes fundlySkeletonPulse {
          0% { opacity: 0.45; }
          50% { opacity: 0.85; }
          100% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
};
