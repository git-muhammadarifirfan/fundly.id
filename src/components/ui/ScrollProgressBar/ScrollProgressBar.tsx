// ============================================
// Fundly.id — Top Scroll Progress Bar Component
// Lime Green Theme Progress Indicator for Page Scroll
// ============================================

import React, { useEffect, useState } from 'react';
import styles from './ScrollProgressBar.module.css';

export const ScrollProgressBar: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      const currentScroll = window.scrollY || document.documentElement.scrollTop;
      const progress = (currentScroll / totalHeight) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className={styles.scrollProgressTrack}>
      <div 
        className={styles.scrollProgressBar} 
        style={{ width: `${scrollProgress}%` }} 
      />
    </div>
  );
};
