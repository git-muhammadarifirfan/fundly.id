// ============================================
// Fundly.id — Logo mark (huruf "F" + koin), sama dengan public/favicon.svg
// ============================================

import React from 'react';

interface LogoMarkProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Glyph logo tanpa latar; letakkan di dalam wadah berwarna lime. */
export const LogoMark: React.FC<LogoMarkProps> = ({ size = 22, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="103 97 320 320"
    className={className}
    role="img"
    aria-label="Fundly"
    focusable="false"
  >
    <g fill="none" stroke={color} strokeWidth="72" strokeLinecap="round" strokeLinejoin="round">
      <path d="M182 372V142h148" />
      <path d="M182 254h96" />
    </g>
    <circle cx="352" cy="254" r="28" fill={color} />
  </svg>
);
