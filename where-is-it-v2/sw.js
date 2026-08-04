/**
 * sw.js
 * Service Worker per il caching offline.
 * Cache-first strategy per assets statici, network-first per dati dinamici.
 */

const CACHE_NAME = 'where-is-it-v2';
const CACHE_VERSION = '1.0.0';

// Assets da cacheare all'installazione
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/style.css',
    '/src/app.js',
    '/src/core/event-bus.js',
    '/src/data/db.js',
    '/src/layers/business.js',
    '/src/layers/ui.js',
    '/src/utils/helpers.js'
];

// Installazione: cachea assets statici
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version', CACHE_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Attivazione: pulisce vecchie cache
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating version', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch: cache-first per statici, network-first per API/dati
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora richieste non-GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignora richieste esterne (es. mappe, analytics)
    if (url.origin !== location.origin) {
        return;
    }

    // Cache-first per assets statici
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    return fetch(request)
                        .then(networkResponse => {
                            // Cache solo se successo
                            if (networkResponse && networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            
                            return networkResponse;
                        })
                        .catch(() => {
                            // Offline: ritorna pagina offline custom se disponibile
                            return caches.match('/index.html');
                        });
                })
        );
        return;
    }

    // Network-first per tutto il resto (API, dati dinamici)
    event.respondWith(
        fetch(request)
            .then(networkResponse => {
                // Cache anche le risposte dinamiche
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseClone);
                        });
                }
                
                return networkResponse;
            })
            .catch(() => {
                // Fallback alla cache se offline
                return caches.match(request);
            })
    );
});

/**
 * Verifica se un asset è considerato "statico"
 */
function isStaticAsset(pathname) {
    const staticExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.svg', '.ico'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Messaggi dal client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
