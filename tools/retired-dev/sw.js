// Retire only this preview's service worker and app cache. Vault data stays intact.
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  const scope = new URL(self.registration.scope);
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.endsWith(" " + scope.pathname)).map(key => caches.delete(key)));
  await self.registration.unregister();
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    const url = new URL(client.url);
    if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) continue;
    const released = new URL("../", scope);
    released.hash = url.hash;
    await client.navigate(released.href);
  }
})()));
