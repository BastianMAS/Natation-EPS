// ══════════════════════════════════════════════
// SERVICE WORKER — EPS Natation
// Version auto-incrémentée à chaque déploiement
// ══════════════════════════════════════════════

const APP_VERSION = '4.1';
const CACHE_NAME  = 'natation-v' + APP_VERSION;

// Fichiers à mettre en cache pour le mode offline
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icons/logo_app.png',
  './icons/logo_assn.png',
  './icons/logo_end.png',
  './icons/logo_vit.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Google Fonts (optionnel — graceful degradation si offline)
];

// ── INSTALL : mise en cache des assets ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => {
        console.log('[SW] v'+APP_VERSION+' installé');
        return self.skipWaiting(); // Activer immédiatement sans attendre
      })
  );
});

// ── ACTIVATE : supprimer les anciens caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME) // Supprimer toutes les autres versions
          .map(k => {
            console.log('[SW] Suppression ancien cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => {
        console.log('[SW] v'+APP_VERSION+' activé');
        return self.clients.claim(); // Prendre le contrôle immédiatement
      })
  );
});

// ── FETCH : stratégie Network First pour HTML/JS, Cache First pour images ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignorer les requêtes non-GET et externes (fonts Google, CDN xlsx...)
  if (e.request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin) &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('cdnjs.cloudflare.com')) return;

  const isHTML = e.request.destination === 'document' || url.pathname.endsWith('.html');
  const isScript = url.pathname.endsWith('.js');

  if (isHTML || isScript) {
    // Network First pour HTML et JS → toujours la version la plus récente
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request)) // Fallback cache si offline
    );
  } else {
    // Cache First pour images, fonts → plus rapide
    e.respondWith(
      caches.match(e.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            }
            return response;
          });
        })
        .catch(() => new Response('Offline', { status: 503 }))
    );
  }
});

// ── MESSAGE : forcer la mise à jour depuis l'app ──
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
