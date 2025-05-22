/*
const CACHE_NAME = "smoking-rat-cache-v1";
const FILES_TO_CACHE = [
  "/connectioncheck.html",
  "/index.html",
  "/styles.css", // add  essential assets here
  "https://cdn.glitch.global/0cf2b6f7-4ba9-4143-8df4-61d1ebe352be/iconwob_192.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request)
    )
  );
});
// Service Worker for Cigarette Tracker PWA
*/
const CACHE_NAME = 'cigarette-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/connectioncheck.html',
  '/loginsignup.html',
  '/manifest.json',
  '/login.html',
  '/signup.html',
  '/home.html',
  "https://cdn.glitch.global/0cf2b6f7-4ba9-4143-8df4-61d1ebe352be/iconwob_192.png",
  // Add other assets like CSS, JS, and images here
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        if (event.request.url.startsWith('chrome-extension://')) return;
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Push notification event
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/placeholder.svg?height=192&width=192',
      badge: '/placeholder.svg?height=96&width=96',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      },
      actions: [
        {
          action: 'open',
          title: 'Open App'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Cigarette Tracker', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
}
                     
                     );