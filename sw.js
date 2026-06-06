const CACHE = 'natation-v4';
const ASSETS = ['./', './index.html', './app.js', './manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => {
    if (cached) return cached;
    return fetch(e.request).then(r => {
      if (r.ok) { const c=r.clone(); caches.open(CACHE).then(ch=>ch.put(e.request,c)); }
      return r;
    }).catch(() => cached);
  }));
});
