// Seaseeker service worker.
// - Build/* files have content hashes in their names, so they are cached forever (cache-first).
// - Pages and everything else are network-first so new deploys show up immediately,
//   falling back to the cache when offline.
const VERSION = "0.1.1";
const CACHE = "seaseeker-" + VERSION;
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "TemplateData/style.css",
  "TemplateData/PirataOne-Regular.ttf",
  "TemplateData/icons/icon-192.png",
  "TemplateData/icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .catch(function () { /* shell caching is best-effort */ })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf("seaseeker-") === 0 && key !== CACHE) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.indexOf("/Build/") !== -1) {
    // Hashed build files: cache-first.
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(request).then(function (hit) {
          if (hit) return hit;
          return fetch(request).then(function (response) {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Everything else: network-first, cache fallback.
  event.respondWith(
    fetch(request).then(function (response) {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(request).then(function (hit) {
        return hit || caches.match("index.html");
      });
    })
  );
});
