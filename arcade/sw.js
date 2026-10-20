// Cache-first com atualização em segundo plano: funciona offline após o primeiro acesso.
// A lista de assets vem de assets/manifest.json (gerado por tools/build-assets.mjs).
const CACHE = 'arcade-trio-v4';
const CORE = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'assets/manifest.json',
  'js/main.js', 'js/ui.js', 'js/store.js', 'js/sfx.js', 'js/registry.js', 'js/assets.js', 'js/offline.js',
  'js/games/uno/index.js', 'js/games/uno/logic.js', 'js/games/uno/ai.js', 'js/games/uno/config.js', 'js/games/uno/art.js',
  'js/games/golf/index.js', 'js/games/golf/physics.js', 'js/games/golf/levels.js',
  'js/games/pinball/index.js', 'js/games/pinball/physics.js', 'js/games/pinball/tables.js'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const assets = await fetch('assets/manifest.json').then((r) => r.json()).catch(() => []);
    // Set: cache.addAll rejeita URLs duplicadas e a instalação inteira falharia em silêncio
    await c.addAll([...new Set([...CORE, ...assets])]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
