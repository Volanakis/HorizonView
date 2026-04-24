# PWA Setup Skill

Add Progressive Web App features: service worker, manifest, offline support.

## Steps

### 1. Create Manifest

`public/manifest.json`:

```json
{
  "name": "HorizonView",
  "short_name": "HorizonView",
  "description": "Airline Flight & Reservation Management",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#00100F",
  "theme_color": "#017481",
  "categories": ["travel", "business"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Add HTML Meta Tags

```html
<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#017481">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="HorizonView">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
</head>
```

### 3. Create Service Worker

`public/sw.js`:

```javascript
const CACHE_NAME = 'horizonview-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request).then((fetchResponse) => {
        // Cache successful responses
        if (fetchResponse.status === 200) {
          const clone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      // Offline fallback
      return caches.match('/');
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
});
```

### 4. Register Service Worker

In `public/js/app.js`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered'))
      .catch((err) => console.error('SW registration failed', err));
  }
});
```

## Verification

1. Open DevTools > Application > Service Workers
2. Check manifest in Application > Manifest
3. Test offline: Network > Offline, reload page
4. Lighthouse audit for PWA score
