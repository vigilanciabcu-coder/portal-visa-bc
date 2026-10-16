import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Limpeza preventiva de Service Workers ou caches obsoletos em desenvolvimento (evita tela branca no iframe)
if (!import.meta.env.PROD && typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    }).catch(() => {});
  }
}

// Em produção, registra o Service Worker do PWA para suporte offline
if (import.meta.env.PROD) {
  try {
    registerSW({ immediate: true });
  } catch (err) {
    console.warn('[PWA] Erro ao registrar Service Worker:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Portal da Vigilância Sanitária">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

