// Service Worker Oficial do Portal VISA-BC (Estratégia Network-First Segura)
// NUNCA bloqueia o preview e SEMPRE prioriza a rede para evitar telas brancas

const CACHE_NAME = 'visa-bc-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/brasao_bc.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignora erros de assets opcionais na instalação
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Network-First com fallback seguro: nunca intercepta ou bloqueia requisições do Vite
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições de outros domínios, APIs, WebSockets, ou módulos internos do Vite
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('node_modules') ||
    url.pathname.includes('vite')
  ) {
    return;
  }

  // Network-First: Sempre tenta a rede primeiro
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a resposta for válida, armazena no cache em segundo plano de forma assíncrona
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Somente se a rede falhar totalmente (ex: offline), busca no cache
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Se for navegação de página HTML e offline, retorna a página inicial do cache
        if (event.request.mode === 'navigate') {
          const cachedHome = await caches.match('/');
          if (cachedHome) return cachedHome;
        }
        return new Response('Offline - Portal VISA-BC', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
