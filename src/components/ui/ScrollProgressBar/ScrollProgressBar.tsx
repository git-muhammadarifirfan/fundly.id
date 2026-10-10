// ============================================
// Fundly.id - Top Scroll Progress Bar Component
// Lime Green Theme Progress Indicator for Page Scroll
// ============================================

import React, { useEffect, useRef } from 'react';
import styles from './ScrollProgressBar.module.css';

/**
 * Progress bar diperbarui langsung lewat transform (GPU) di requestAnimationFrame,
 * tanpa setState di setiap event scroll, agar scroll tetap mulus di HP.
 */
export const ScrollProgressBar: React.FC = () => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const bar = barRef.current;
      if (!bar) return;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / totalHeight)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.scrollProgressTrack}>
      <div ref={barRef} className={styles.scrollProgressBar} />
    </div>
  );
};
