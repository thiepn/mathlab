import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppErrorBoundary } from './app/components/AppErrorBoundary';
import './styles/tokens.css';
import './styles/global.css';
import './styles/app.css';
import './styles/m1.css';
import './styles/m2.css';
import './styles/m3.css';
import './styles/m4.css';
import './styles/m5.css';
import './styles/m6.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('MathLab service worker registration failed.', error));
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('MathLab root element is missing.');

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
);
