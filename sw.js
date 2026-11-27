const CACHE = "att-gora-shell-v3";
const FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./fonts.css",
  "./manifest.webmanifest",
  "./fonts/fraunces-latin.woff2",
  "./fonts/fraunces-italic-latin.woff2",
  "./fonts/outfit-latin.woff2",
  "./icon-192.png",
  "./icon-512.png",
  "./icon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match("./index.html");
      })
  );
});
