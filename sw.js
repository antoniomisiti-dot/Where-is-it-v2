const CACHE_NAME = 'dove-modular-v1';
const urlsToCache = [
  './',
  './index.html',
  './src/assets/style.css',
  './src/core/config.js',
  './src/core/event-bus.js',
  './src/core/app.js',
  './src/data/storage-adapter.js',
  './src/data/localstorage-provider.js',
  './src/logic/history-manager.js',
  './src/logic/collection-manager.js',
  './src/ui/renderer.js',
  './src/ui/sheets.js',
  './src/ui/components.js',
  './src/utils/geo.js',
  './src/utils/formatters.js',
  './src/utils/crypto.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) return response;
      return fetch(e.request).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});