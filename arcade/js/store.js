// Progresso e preferências no localStorage (com fallback silencioso se estiver bloqueado).
const KEY = 'arcade-trio.v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function write(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* modo privado */ }
}

export const getStars = (game, mode, level) => read().stars?.[game]?.[mode]?.[level] ?? 0;

export function setStars(game, mode, level, n) {
  const d = read();
  d.stars ??= {}; d.stars[game] ??= {}; d.stars[game][mode] ??= {};
  d.stars[game][mode][level] = Math.max(d.stars[game][mode][level] ?? 0, n);
  write(d);
}

/** Solo libera fase a fase; dupla é livre porque jogam amigos juntos. */
export const isUnlocked = (game, mode, level) => mode === 'duo' || level === 1 || getStars(game, mode, level - 1) > 0;

export const getPrefs = () => ({ mode: 'solo', muted: false, names: ['Jogador 1', 'Jogador 2'], ...read().prefs });
export function setPrefs(patch) {
  const d = read();
  d.prefs = { ...getPrefs(), ...patch };
  write(d);
}
