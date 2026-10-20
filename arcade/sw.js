// Cache-first com atualização em segundo plano: funciona offline após o primeiro acesso.
const CACHE = 'arcade-trio-v1';
const CORE = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'js/main.js', 'js/ui.js', 'js/store.js', 'js/sfx.js', 'js/registry.js',
  'js/games/uno/index.js', 'js/games/uno/logic.js', 'js/games/uno/ai.js', 'js/games/uno/config.js',
  'js/games/golf/index.js', 'js/games/golf/physics.js', 'js/games/golf/levels.js',
  'js/games/pinball/index.js', 'js/games/pinball/physics.js', 'js/games/pinball/tables.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
