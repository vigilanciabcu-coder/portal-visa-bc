import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Limpeza preventiva segura de Service Workers e caches obsoletos (ignora restrições de sandbox em iframes)
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
} catch {
  // Ignora restrições de permissão de iframe cross-origin
}

try {
  if (typeof window !== 'undefined' && 'caches' in window) {
    caches.keys?.().then((keys) => {
      keys.forEach((key) => caches.delete(key).catch(() => {}));
    }).catch(() => {});
  }
} catch {
  // Ignora restrições de permissão de iframe cross-origin
}

// Em produção, registra o Service Worker do PWA para suporte offline
if (import.meta.env.PROD) {
  try {
    registerSW({ immediate: true });
  } catch (err) {
    console.warn('[PWA] Service Worker não registrado:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Portal da Vigilância Sanitária">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

