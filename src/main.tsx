// ============================================
// Fundly.id - Application Entry Point
// ============================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global Styles
import './styles/index.css';
import './styles/animations.css';
import './styles/responsive.css';

// Service worker: aplikasi tetap bisa dibuka saat offline (hanya build produksi)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('[Fundly] Service worker gagal:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
