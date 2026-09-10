// ============================================
// Fundly.id — GSAP Smooth Animated Number Component
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

    // Reset initial value to 0 for smooth count-up entry
    objRef.current.val = 0;

    const tween = gsap.fromTo(
      objRef.current,
      { val: 0 },
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
