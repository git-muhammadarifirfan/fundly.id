// ============================================
// Fundly.id — useAnimations Hook (GSAP)
// ============================================

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Hook untuk animasi stagger fade-in pada list items
 */
export function useStaggerAnimation<T extends HTMLElement>(
  dependency?: unknown,
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const children = containerRef.current.children;
    if (children.length === 0) return;

    gsap.fromTo(
      children,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power2.out',
        clearProps: 'all',
      },
    );
  }, [dependency]);

  return containerRef;
}

/**
 * Hook untuk animasi count-up angka
 */
export function useCountUp(
  targetValue: number,
  duration: number = 1.2,
  delay: number = 0,
) {
  const ref = useRef<HTMLElement>(null);
  const valueRef = useRef({ value: 0 });

  useEffect(() => {
    if (!ref.current) return;

    gsap.to(valueRef.current, {
      value: targetValue,
      duration,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = Math.round(valueRef.current.value).toLocaleString('id-ID');
        }
      },
    });

    return () => {
      gsap.killTweensOf(valueRef.current);
    };
  }, [targetValue, duration, delay]);

  return ref;
}

/**
 * Hook untuk animasi fade-in saat elemen masuk viewport
 */
export function useFadeInOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'all',
      },
    );
  }, []);

  return ref;
}

/**
 * Hook untuk animasi progress bar
 */
export function useProgressAnimation(
  targetWidth: number,
  duration: number = 0.8,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    gsap.fromTo(
      ref.current,
      { width: '0%' },
      {
        width: `${Math.min(targetWidth, 100)}%`,
        duration,
        delay: 0.3,
        ease: 'power2.out',
      },
    );
  }, [targetWidth, duration]);

  return ref;
}
