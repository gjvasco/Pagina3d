/* ==========================================================================
   3D PRINT HUB - SERVICE WORKER FOR PWA OFFLINE CAPABILITY
   ========================================================================== */

const CACHE_NAME = '3d-print-hub-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/calculator.js',
  './js/viewer3d.js'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Delete ALL old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First with Cache Fallback)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Clone and update cache with fresh response
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, clone);
        });
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(e.request);
      })
  );
});
