// Modo offline: registra o service worker, acompanha conexão/atualização e expõe o botão "Instalar".
const state = { supported: 'serviceWorker' in navigator && location.protocol !== 'file:', ready: false, online: navigator.onLine, update: false, canInstall: false };
let installEvent = null;

export const getNetState = () => ({ ...state });
const emit = () => window.dispatchEvent(new CustomEvent('arcade:net', { detail: getNetState() }));

window.addEventListener('online', () => { state.online = true; emit(); });
window.addEventListener('offline', () => { state.online = false; emit(); });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; state.canInstall = true; emit(); });
window.addEventListener('appinstalled', () => { installEvent = null; state.canInstall = false; emit(); });

export async function promptInstall() {
  if (!installEvent) return false;
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null; state.canInstall = false; emit();
  return outcome === 'accepted';
}

export async function initOffline() {
  if (!state.supported) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) { state.update = true; emit(); }
      });
    });
    await navigator.serviceWorker.ready;
    // "pronto" = o pré-cache terminou (o manifesto de assets é o último item gravado)
    for (let i = 0; i < 40 && !state.ready; i++) {
      state.ready = !!(await caches.match('assets/manifest.json'));
      if (!state.ready) await new Promise((r) => setTimeout(r, 250));
    }
    emit();
  } catch (e) {
    console.warn('Modo offline indisponível:', e);
  }
}
