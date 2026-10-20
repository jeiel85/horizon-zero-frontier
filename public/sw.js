/* Service worker for HORIZON: ZERO FRONTIER (GitHub Pages, scope: this directory). */
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'horizon-zero-frontier-' + CACHE_VERSION;
const INDEX_URL = new URL('./index.html', self.registration.scope).href;
const PRECACHE_URLS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((path) => new URL(path, self.registration.scope).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('horizon-zero-frontier-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
}

async function networkFirstNavigation(event) {
  try {
    const response = await fetch(event.request);
    putInCache(event.request, response);
    return response;
  } catch (error) {
    const cached = (await caches.match(event.request)) || (await caches.match(INDEX_URL));
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(event) {
  const cached = await caches.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      putInCache(event.request, response);
      return response;
    });
  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;
  // Respect explicit cache bypass (e.g. fetch(url, { cache: 'no-store' }) for version checks).
  if (request.cache === 'no-store' || request.cache === 'reload') return;
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});
