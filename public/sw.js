// Donna service worker — deliberately conservative for a multi-tenant app.
//
// It exists to satisfy PWA installability (a fetch handler on HTTPS) and to
// give a graceful offline screen — NOT to cache tenant data. Caching HTML of
// authenticated, tenant-scoped pages in the SW could serve one user's data to
// another on a shared device, so we NEVER cache navigations or API responses.
// Only the offline fallback and a few static, non-sensitive assets are cached.

const CACHE = "donna-shell-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle top-level navigations. Everything else (API calls, RSC
  // payloads, Clerk, tenant data) goes straight to the network, uncached.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL, { ignoreSearch: true })),
  );
});
