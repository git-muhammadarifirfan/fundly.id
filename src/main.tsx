// ============================================
// Fundly.id — Application Entry Point
// ============================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global Styles
import './styles/index.css';
import './styles/animations.css';
import './styles/responsive.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
