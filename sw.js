// Offline működés. Az első megnyitáskor minden fájlt eltárol; utána a tárolt példányt adja azonnal,
// és közben a háttérben frissíti, így a következő megnyitáskor már az új verzió fut.
// Új fájl a web/ mappában → kerüljön az ASSETS-be is (a tests/pwa.test.js ellenőrzi).
// Új kiadásnál növeld a CACHE számát.
const CACHE = 'jatekido-v1';
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "timer.js",
  "format.js",
  "sound.js",
  "wakelock.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) void cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      if (!cached) return fresh;
      event.waitUntil(fresh);
      return cached;
    }),
  );
});
