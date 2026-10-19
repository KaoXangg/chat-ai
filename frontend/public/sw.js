const CACHE_NAME = "chat-ai-pwa-v1";

// Core static assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/brand-logo.png",
  "/manifest.json",
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Pre-caching issue:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - clean up obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // NEVER cache API requests, SSE streaming, authentication, or external analytical scripts
  if (
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin && !url.hostname.includes("fonts.googleapis.com") && !url.hostname.includes("fonts.gstatic.com")
  ) {
    return;
  }

  // Navigation requests (HTML SPA pages): Network first, fallback to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid, clone and cache index.html
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match("/index.html");
          if (cached) return cached;
          return caches.match("/");
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for custom skipWaiting messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
