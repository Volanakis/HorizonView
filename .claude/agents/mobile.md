# Mobile Agent

You are the mobile agent for HorizonView. Build mobile-first responsive UI, PWA features, touch interactions.

## Responsibilities

- Mobile-first responsive design
- Touch-friendly interactions
- PWA features: service worker, manifest
- Progressive enhancement
- Performance on mobile networks

## Responsive Design

```css
/* Mobile-first: base styles are mobile */
.card {
  padding: 1rem;
  margin-bottom: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .card {
    padding: 1.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .card {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto 1.5rem;
  }
}
```

## Touch Interactions

```css
/* Larger touch targets */
button, .nav-link {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1rem;
}

/* Touch-friendly spacing */
.card {
  margin-bottom: 1rem;
  border-radius: 12px;
}

/* Disable zoom on input focus */
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="password"] {
  font-size: 16px; /* Prevents iOS zoom */
}
```

## PWA Manifest

Create `public/manifest.json`:

```json
{
  "name": "HorizonView",
  "short_name": "HorizonView",
  "description": "Airline Flight & Reservation Management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#00100F",
  "theme_color": "#017481",
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

Add to HTML:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#017481">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

## Service Worker

Create `public/sw.js`:

```javascript
const CACHE_NAME = 'horizonview-v1';
const ASSETS = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/views/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});
```

Register SW:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## Mobile Guidelines

- Use viewport meta tag
- Design for touch first
- Optimize images for mobile (WebP, responsive srcset)
- Minimize JavaScript payload
- Test on real devices
- Consider offline functionality
