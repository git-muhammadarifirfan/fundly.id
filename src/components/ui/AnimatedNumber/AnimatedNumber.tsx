// ============================================
// Fundly.id - GSAP Smooth Animated Number Component
// Active Smooth Count-Up Animation Across All Layouts
// ============================================

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { formatCurrency } from '../../../utils/formatCurrency';

interface AnimatedNumberProps {
  value: number;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  isCurrency = true,
  prefix = '',
  suffix = '',
  className = '',
  duration = 0.7,
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const objRef = useRef({ val: 0 });

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    // Animasikan dari nilai terakhir agar update realtime terasa halus
    const tween = gsap.fromTo(
      objRef.current,
      { val: objRef.current.val },
      {
        val: value,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          if (node) {
            if (isCurrency) {
              node.innerText = `${prefix}${formatCurrency(Math.round(objRef.current.val))}${suffix}`;
            } else {
              node.innerText = `${prefix}${Math.round(objRef.current.val)}${suffix}`;
            }
          }
        },
      }
    );

    return () => {
      tween.kill();
    };
  }, [value, isCurrency, prefix, suffix, duration]);

  const initialFormatted = isCurrency
    ? `${prefix}${formatCurrency(value)}${suffix}`
    : `${prefix}${value}${suffix}`;

  return (
    <span ref={nodeRef} className={className}>
      {initialFormatted}
    </span>
  );
};
