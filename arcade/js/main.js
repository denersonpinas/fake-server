import { h, modal, icon, starRow } from './ui.js';
import * as store from './store.js';
import { setMuted } from './sfx.js';
import { GAMES, byId } from './registry.js';

const app = document.getElementById('app');
let session = null; // { destroy() } do jogo em execução
let token = 0;      // invalida montagens assíncronas antigas

function show(view) {
  token++;
  teardown();
  app.replaceChildren(view);
  window.scrollTo(0, 0);
}

function teardown() {
  try { session?.destroy?.(); } catch (e) { console.error(e); }
  session = null;
  document.querySelectorAll('.modal-backdrop').forEach((n) => n.remove());
}

const go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };

/* ---------- Início ---------- */
function home() {
  show(h('main', { class: 'screen home' },
    h('header', { class: 'hero' }, h('img', { class: 'hero-mark', src: 'assets/brand/mark.svg', alt: '', width: 84, height: 84 }), h('h1', null, 'Arcade ', h('span', null, 'Trio')), h('p', null, 'Pinball, minigolfe e UNO — solo ou em dupla')),
    h('div', { class: 'cards' }, GAMES.map((g) => {
      const done = ['solo', 'duo'].reduce((n, m) => n + g.levels[m].filter((_, i) => store.getStars(g.id, m, i + 1) > 0).length, 0);
      const total = g.levels.solo.length + g.levels.duo.length;
      return h('button', { class: `card game-${g.id}`, onClick: () => go(`#/g/${g.id}`) },
        h('img', { class: 'card-art', src: `assets/covers/${g.id}.svg`, alt: '', width: 72, height: 72 }), h('strong', null, g.title), h('small', null, g.tagline),
        h('span', { class: 'progress' }, `${done}/${total} fases`));
    })),
    h('footer', null, 'Funciona offline depois do primeiro acesso · Instale pelo menu do navegador')));
}

/* ---------- Seleção de modo e fase ---------- */
function setup(gameId) {
  const game = byId(gameId);
  if (!game) return go('#/');
  const prefs = store.getPrefs();
  let mode = prefs.mode;
  const names = [...prefs.names];

  const levelsBox = h('div', { class: 'levels' });
  const namesBox = h('div', { class: 'names' });
  const modeBtns = {};

  const draw = () => {
    for (const [m, b] of Object.entries(modeBtns)) b.classList.toggle('active', m === mode);
    namesBox.replaceChildren(...(mode === 'duo' ? names.map((n, i) => h('label', null, `Jogador ${i + 1}`,
      h('input', { value: n, maxlength: 14, onInput: (e) => { names[i] = e.target.value; store.setPrefs({ names }); } }))) : []));
    namesBox.hidden = mode !== 'duo';
    levelsBox.replaceChildren(...game.levels[mode].map((lv, i) => {
      const n = i + 1;
      const open = store.isUnlocked(game.id, mode, n);
      const st = store.getStars(game.id, mode, n);
      return h('button', { class: `level ${open ? '' : 'locked'}`, disabled: !open, onClick: () => { store.setPrefs({ mode, names }); go(`#/p/${game.id}/${mode}/${n}`); } },
        h('b', null, open ? n : icon('lock')), h('span', null, h('strong', null, lv.title), h('small', null, lv.desc)), h('em', null, st ? starRow(st) : ''));
    }));
  };

  for (const [m, ic, label] of [['solo', 'user', 'Solo'], ['duo', 'users', 'Dupla']]) {
    modeBtns[m] = h('button', { class: 'seg-btn', onClick: () => { mode = m; store.setPrefs({ mode }); draw(); } }, icon(ic), ' ', label);
  }
  draw();

  show(h('main', { class: 'screen setup' },
    h('header', { class: 'bar' }, h('button', { class: 'btn ghost', onClick: () => go('#/') }, icon('back'), ' Início'), h('img', { class: 'bar-art', src: `assets/covers/${game.id}.svg`, alt: '', width: 36, height: 36 }), h('h2', null, game.title)),
    h('p', { class: 'howto' }, game.howto),
    h('div', { class: 'seg' }, modeBtns.solo, modeBtns.duo),
    namesBox,
    levelsBox));
}

/* ---------- Jogo ---------- */
async function play(gameId, mode, level) {
  const game = byId(gameId);
  const lv = game?.levels[mode]?.[level - 1];
  if (!lv) return go('#/');
  const prefs = store.getPrefs();
  const stage = h('div', { class: 'stage' });
  const soundIcon = () => icon(prefs.muted ? 'sound-off' : 'sound-on');
  const muteBtn = h('button', { class: 'btn ghost', title: 'Som', 'aria-label': 'Ligar/desligar som', onClick: () => { prefs.muted = !prefs.muted; setMuted(prefs.muted); store.setPrefs({ muted: prefs.muted }); muteBtn.replaceChildren(soundIcon()); } }, soundIcon());
  setMuted(prefs.muted);
  show(h('main', { class: 'screen play' },
    h('header', { class: 'topbar' },
      h('button', { class: 'btn ghost', onClick: () => go(`#/g/${gameId}`) }, icon('back'), ' Fases'),
      h('div', { class: 'title' }, `${game.title} · ${level}. ${lv.title}`, h('small', null, mode === 'duo' ? 'Dupla' : 'Solo')),
      h('button', { class: 'btn ghost', title: 'Reiniciar', 'aria-label': 'Reiniciar fase', onClick: () => route() }, icon('restart')), muteBtn),
    stage));
  const mine = token;
  const mod = await game.load();
  if (mine !== token) return; // usuário saiu enquanto carregava

  const names = mode === 'duo' ? prefs.names.map((n, i) => n.trim() || `Jogador ${i + 1}`) : [prefs.names[0].trim() || 'Você'];
  session = mod.mount(stage, {
    mode, level, names,
    onFinish: (r) => {
      if (r.won) store.setStars(gameId, mode, level, r.stars || 1);
      const next = level < game.levels[mode].length && store.isUnlocked(gameId, mode, level + 1);
      modal({
        title: r.title,
        body: [r.stars ? h('div', { class: 'big-stars' }, starRow(r.stars)) : null, ...(r.lines || []).map((l) => h('p', null, l))],
        actions: [
          { label: 'Fases', onClick: () => go(`#/g/${gameId}`) },
          { label: 'Jogar de novo', primary: !(r.won && next), onClick: () => route() },
          ...(r.won && next ? [{ label: 'Próxima fase', primary: true, onClick: () => go(`#/p/${gameId}/${mode}/${level + 1}`) }] : []),
        ],
      });
    },
  });
}

/* ---------- Rotas por hash (o botão voltar funciona) ---------- */
function route() {
  const [, kind, id, mode, level] = location.hash.split('/');
  if (kind === 'g') setup(id);
  else if (kind === 'p' && (mode === 'solo' || mode === 'duo')) play(id, mode, Number(level));
  else home();
}
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
