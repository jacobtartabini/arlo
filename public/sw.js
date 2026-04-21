// Bump this version any time the caching strategy changes — old caches will be purged.
const CACHE_NAME = 'arlo-ai-v4';

// Only cache stable, non-versioned static assets here.
// Do NOT cache '/', HTML documents, or hashed JS/CSS chunks — those must always
// come from the network so users pick up new builds immediately.
const urlsToCache = [
  '/manifest.json',
  '/offline.html',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[sw] Opened cache', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('[sw] Cache install failed:', error);
      })
  );
  self.skipWaiting();
});

// Fetch event:
//   - HTML / navigations  → network-first (so new builds are always picked up)
//   - Hashed JS/CSS chunks → network-first, never serve a stale chunk
//   - Other static assets  → cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GETs; let everything else hit the network untouched.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests entirely (Supabase, Google APIs, etc.)
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    req.mode === 'navigate' || req.destination === 'document';
  const isHashedAsset =
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|map)$/.test(url.pathname);

  if (isNavigation || isHashedAsset) {
    // Network-first: always try the network so users get the latest build.
    event.respondWith(
      fetch(req).catch(() => {
        if (isNavigation) {
          return caches.match('/offline.html');
        }
        return caches.match(req);
      })
    );
    return;
  }

  // Static assets: cache-first with network fallback.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => {
        if (req.destination === 'document') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let data = { title: 'Arlo', body: 'New notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    tag: data.tag || 'arlo-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (event.notification.data?.url) {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
