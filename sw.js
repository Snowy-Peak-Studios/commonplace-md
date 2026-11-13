// Caches the app's own files so it opens fast and survives a flaky connection.
// Notes always come from api.github.com and are never cached here.
const CACHE = "commonplace-v11";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "src/styles.css", "src/app.js", "src/store.js",
  "src/github.js", "src/vault.js", "src/markdown.js", "src/bases.js", "src/editor.js", "src/csv.js", "src/icons.js",
  "vendor/vendor.js", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
];
// vendor/mermaid.min.js (~3.5 MB) is left out on purpose: the fetch handler below caches it the first time a diagram needs it.

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first, so a new version shows on the next load; the cache answers when offline.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
});
