import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// 1. Mount React application immediately with ErrorBoundary protection
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

// 2. Safe deferred Service Worker registration (only in top-level window, skipped in iframes)
try {
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (!isIframe && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            reg.update().catch(() => {});
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration skipped:', err);
          });
      } catch (err) {
        console.warn('[PWA] Service Worker initialization error:', err);
      }
    });
  }
} catch {
  // Ignore iframe security constraints
}

