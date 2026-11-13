// Service worker de Petit Étal : rend le jeu installable et jouable hors connexion.
// Réseau d'abord (les mises à jour arrivent dès qu'on est en ligne), cache en secours.
const CACHE = 'etal-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // L'APK (plusieurs dizaines de Mo) ne passe pas par le cache.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('.apk')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./'))),
  );
});
