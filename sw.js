// BSQ Shuttle offline support.
// Bump VERSION whenever you change any file, so phones pick up the new copy.
const VERSION = 'v1';
const CACHE = 'bsq-shuttle-' + VERSION;

const FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Page: try the network for the latest schedule, but fall back to the saved copy
// after 3 seconds or when offline, so slow campus Wi-Fi never leaves a blank screen.
function pageRequest(request) {
  const fromNetwork = fetch(request).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put('/', copy));
    }
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  return Promise.race([fromNetwork, timeout.then(() => caches.match('/'))])
    .then((res) => res || fromNetwork)
    .catch(() => caches.match('/'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(pageRequest(request));
    return;
  }

  // Icons and other files: saved copy first, network if missing
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
