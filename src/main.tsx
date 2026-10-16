import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Limpeza preventiva de qualquer Service Worker residual para garantir carregamento limpo
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
} catch {
  // Ignora restrições de permissão de sandbox
}

try {
  if (typeof window !== 'undefined' && 'caches' in window && caches.keys) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key).catch(() => {}));
    }).catch(() => {});
  }
} catch {
  // Ignora restrições de permissão de sandbox
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Portal da Vigilância Sanitária">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

