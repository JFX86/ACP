const VERSION = 'v1.0.3';
const CACHE_NAME = `acp-checklists-cache-${VERSION}`;

// List of files that constitute the "app shell".
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/index.tsx',
    '/App.tsx',
    '/constants.ts',
    '/types.ts',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// On install, cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // We use addAll, which is atomic. If one file fails, the whole operation fails.
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(error => {
        console.error('Failed to cache app shell:', error);
      })
  );
});

// On activate, clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// On fetch, use a cache-first then network strategy
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clone the response because it's a stream and can only be consumed once.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.log('Fetch failed; returning offline page instead.', error);
            // Optional: return a fallback page if a fetch fails, e.g., an offline.html page.
            // For this app, if the app shell is cached, it should work fine without this.
        });
      })
    );
});