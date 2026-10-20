/* Service worker for HORIZON: ZERO FRONTIER (GitHub Pages, scope: this directory). */
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'horizon-zero-frontier-';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const SCOPE = self.registration.scope;
const INDEX_URL = new URL('./index.html', SCOPE).href;
const PRECACHE_URLS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
// Also precache the hashed build assets (./assets/*) referenced by index.html, so an app
// installed on the first visit can start offline (the entry bundle loads before the SW is active).
const PRECACHE_INDEX_ASSETS = true;

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(PRECACHE_URLS.map((path) => new URL(path, SCOPE).href));
  if (!PRECACHE_INDEX_ASSETS) return;
  const index = await cache.match(INDEX_URL);
  if (!index) return;
  const html = await index.text();
  const assetUrls = new Set();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], INDEX_URL);
    if (url.origin === self.location.origin && url.href.startsWith(SCOPE + 'assets/')) {
      assetUrls.add(url.href);
    }
  }
  await cache.addAll([...assetUrls]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return Promise.resolve();
  const copy = response.clone();
  return caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch((error) => console.warn('Cache write failed:', request.url, error));
}

async function networkFirstNavigation(event) {
  const { request } = event;
  try {
    const response = await fetch(request);
    event.waitUntil(putInCache(request, response));
    return response;
  } catch (error) {
    const cached = (await caches.match(request)) || (await caches.match(INDEX_URL));
    if (cached) return cached;
    throw error;
  }
}

function staleWhileRevalidate(event) {
  const { request } = event;
  const network = fetch(request);
  // Keep the worker alive until the cache write finishes (also when a cached copy is served).
  event.waitUntil(network.then((response) => putInCache(request, response)).catch(() => {}));
  return caches.match(request).then((cached) => cached || network);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  // Respect explicit cache bypass (e.g. fetch(url, { cache: 'no-store' }) for version checks).
  if (request.cache === 'no-store' || request.cache === 'reload') return;
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});
