const SHELL_CACHE = 'mathlab-e1-shell';
const RUNTIME_CACHE = 'mathlab-e1-runtime';
const SHELL = ['./', './index.html', './manifest.webmanifest', './mathlab-mark.svg', './mathlab-icon-192.png', './mathlab-icon-512.png', './mathlab-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('mathlab-') && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)),
  )));
  self.clients.claim();
});

async function cacheResponse(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return response;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => cacheResponse(event.request, response))
        .catch(async () => (await caches.match(event.request)) || (await caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) {
      event.waitUntil(fetch(event.request).then((response) => cacheResponse(event.request, response)).catch(() => undefined));
      return cached;
    }
    return fetch(event.request).then((response) => cacheResponse(event.request, response));
  })());
});
