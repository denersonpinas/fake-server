import { h, toast, modal } from '../../ui.js';
import { beep, jingle } from '../../sfx.js';
import { COLORS, COLOR_NAMES, createGame, playCard, drawCard, passTurn, callUno, legalMoves, isWild, roundPoints } from './logic.js';
import { chooseMove } from './ai.js';
import { SOLO_LEVELS, DUO_LEVELS, BOT_NAMES } from './config.js';

import { cardSvg, backSvg } from './art.js';

const ORDER = { red: 0, yellow: 1, green: 2, blue: 3 };

function cardEl(card, extra = '') {
  const el = h('div', { class: `ucard ${extra}`.trim(), 'data-id': card.id });
  el.innerHTML = cardSvg(card);
  return el;
}
function backEl(cls = '') {
  const el = h('div', { class: `ucard back ${cls}`.trim() });
  el.innerHTML = backSvg();
  return el;
}

export function mount(root, { mode, level, names, onFinish }) {
  const duo = mode === 'duo';
  const cfg = duo ? DUO_LEVELS[level - 1] : SOLO_LEVELS[level - 1];
  const roster = duo
    ? names.map((name) => ({ name }))
    : [{ name: names[0] }, ...cfg.bots.map((skill, i) => ({ name: BOT_NAMES[i], bot: true, skill }))];

  const match = { wins: roster.map(() => 0), points: roster.map(() => 0), round: 0, lost: 0 };
  let state = null;
  let timer = null;
  let revealed = -1;      // dupla: quem já "pegou" o aparelho nesta vez
  let destroyed = false;
  let pendingColor = null; // carta curinga aguardando escolha de cor

  const view = h('div', { class: 'uno' });
  root.replaceChildren(view);

  const me = () => (duo ? state.current : 0);
  const isHumanTurn = () => !state.players[state.current].bot && state.phase !== 'over';

  function startRound() {
    clearTimeout(timer);
    state = createGame(roster, { first: match.round % roster.length });
    match.round++;
    revealed = -1;
    pendingColor = null;
    step();
  }

  function step() {
    if (destroyed) return;
    clearTimeout(timer);
    if (state.phase === 'over') return endRound();
    render();
    if (state.players[state.current].bot) timer = setTimeout(botTurn, 950);
  }

  function announce(events) {
    for (const e of events) {
      const who = state.players[e.player]?.name;
      if (e.type === 'play') beep(520 + (e.card.kind === 'number' ? e.card.value * 20 : 200), 0.07, 'triangle');
      if (e.type === 'skip') toast(`${who} perdeu a vez ⊘`);
      if (e.type === 'reverse') toast('Sentido invertido ⇄');
      if (e.type === 'draw') toast(`${who} comprou ${e.count} cartas`);
      if (e.type === 'uno') toast(`${state.players[e.player].name}: UNO!`, 1400);
      if (e.type === 'unoPenalty') toast(`${state.players[e.player].name} esqueceu o UNO e comprou 2!`, 2200);
    }
  }

  function botTurn() {
    if (destroyed || state.phase === 'over') return;
    const idx = state.current;
    const p = state.players[idx];
    const move = chooseMove(state);
    if (move.type === 'draw') { drawCard(state); toast(`${p.name} comprou uma carta`, 1000); beep(300, 0.06); }
    else if (move.type === 'pass') { passTurn(state); }
    else {
      if (p.hand.length === 2) callUno(state, idx);
      const ev = playCard(state, move.cardId, move.color);
      if (move.color) toast(`${p.name} escolheu ${COLOR_NAMES[move.color]}`, 1200);
      announce(ev);
    }
    step();
  }

  function humanPlay(card, color) {
    try {
      announce(playCard(state, card.id, color));
    } catch (e) { toast(e.message); return; }
    step();
  }

  function onCard(card) {
    if (!isHumanTurn() || (duo && revealed !== state.current)) return;
    if (!legalMoves(state).some((c) => c.id === card.id)) { toast('Essa carta não pode ser jogada agora'); return; }
    if (isWild(card)) { pendingColor = card; render(); return; }
    humanPlay(card);
  }

  function onDraw() {
    if (!isHumanTurn() || state.phase !== 'play' || (duo && revealed !== state.current)) return;
    drawCard(state);
    beep(300, 0.06);
    step();
  }

  function onUno() {
    if (!isHumanTurn()) return;
    if (!callUno(state)) { toast('UNO só vale com 2 cartas na mão'); return; }
    beep(880, 0.15, 'sawtooth');
    render();
  }

  function onPass() {
    if (state.phase !== 'drawn') return;
    passTurn(state);
    step();
  }

  function endRound() {
    const w = state.winner;
    const pts = roundPoints(state);
    match.wins[w]++;
    match.points[w] += pts;
    if (!roster[0].bot && w !== 0 && !duo) match.lost++;
    render();
    const target = cfg.win.n;
    const done = cfg.win.type === 'rounds' ? match.wins[w] >= target : match.points[w] >= target;
    const winnerName = roster[w].name;
    jingle(w === 0 || duo ? [523, 659, 784, 1046] : [392, 330, 262]);

    const score = h('ul', { class: 'scoreline' }, roster.map((p, i) => h('li', null, `${p.name}: ${match.wins[i]} vitória(s) · ${match.points[i]} pts`)));
    if (!done) {
      modal({ title: `${winnerName} venceu a rodada! (+${pts} pts)`, body: score, actions: [{ label: 'Próxima rodada', primary: true, onClick: startRound }] });
      return;
    }
    const humanWon = duo || w === 0;
    const stars = duo ? 0 : humanWon ? (match.lost === 0 ? 3 : match.lost === 1 ? 2 : 1) : 0;
    onFinish({
      won: humanWon,
      stars,
      title: duo ? `${winnerName} venceu a partida! 🎉` : humanWon ? 'Você venceu a partida! 🎉' : `${winnerName} venceu a partida`,
      lines: roster.map((p, i) => `${p.name}: ${match.wins[i]} vitória(s) · ${match.points[i]} pts`),
    });
  }

  function render() {
    const m = me();
    const cur = state.players[state.current];
    const top = state.discard[state.discard.length - 1];
    const legal = new Set(isHumanTurn() ? legalMoves(state).map((c) => c.id) : []);
    const covered = duo && state.phase !== 'over' && revealed !== state.current;
    const hand = [...state.players[m].hand].sort((a, b) => (ORDER[a.color] ?? 9) - (ORDER[b.color] ?? 9) || (a.value ?? 99) - (b.value ?? 99));
    const you = state.players[m];

    view.replaceChildren(...[
      h('div', { class: 'uno-opps' }, state.players.map((p, i) => i === m ? null : h('div', { class: `opp ${i === state.current && state.phase !== 'over' ? 'turn' : ''}` },
        h('strong', null, p.name), h('div', { class: 'backs' }, Array.from({ length: Math.min(p.hand.length, 9) }, () => backEl('mini'))),
        h('small', null, `${p.hand.length} carta(s)${p.hand.length === 1 ? ' · UNO!' : ''} · ${match.wins[i]} vit.`)))),
      h('div', { class: 'uno-table' },
        h('button', { class: 'pile', onClick: onDraw, 'aria-label': 'Comprar carta', disabled: !(isHumanTurn() && state.phase === 'play') }, backEl(), h('small', null, `Monte ${state.draw.length}`)),
        h('div', { class: 'pile' }, cardEl(top), h('small', { class: `color-chip ${state.color}` }, `${COLOR_NAMES[state.color]} ${state.dir === 1 ? '⟳' : '⟲'}`))),
      h('p', { class: 'status' }, state.phase === 'over' ? 'Fim da rodada' : cur.bot ? `${cur.name} está pensando…` : state.phase === 'drawn' ? 'Jogue a carta comprada ou passe' : `Vez de ${cur.name}`),
      h('div', { class: 'uno-me' },
        h('div', { class: 'me-head' }, h('strong', null, `${you.name} · ${match.wins[m]} vit. · ${you.hand.length} carta(s)`),
          h('span', { class: 'me-btns' },
            h('button', { class: `btn uno-btn ${you.uno ? 'on' : you.hand.length === 2 && isHumanTurn() ? 'hint' : ''}`, onClick: onUno }, 'UNO!'),
            state.phase === 'drawn' && h('button', { class: 'btn', onClick: onPass }, 'Passar'))),
        h('div', { class: 'hand' }, hand.map((c) => {
          const el = cardEl(c, legal.has(c.id) ? 'playable' : isHumanTurn() ? 'dim' : '');
          el.addEventListener('click', () => onCard(c));
          return el;
        }))),
      covered && h('div', { class: 'cover' }, h('div', null, h('h2', null, `Passe o aparelho para ${cur.name}`), h('p', null, 'Os outros não devem olhar a tela!'),
        h('button', { class: 'btn primary', onClick: () => { revealed = state.current; render(); } }, 'Estou pronto(a)'))),
      pendingColor && h('div', { class: 'cover pick' }, h('div', null, h('h2', null, 'Escolha a cor'),
        h('div', { class: 'colors' }, COLORS.map((c) => h('button', { class: `colorbtn ${c}`, 'aria-label': COLOR_NAMES[c], onClick: () => { const card = pendingColor; pendingColor = null; humanPlay(card, c); } }, COLOR_NAMES[c]))),
        h('button', { class: 'btn ghost', onClick: () => { pendingColor = null; render(); } }, 'Cancelar'))),
    ].filter(Boolean));
  }

  startRound();
  return { destroy() { destroyed = true; clearTimeout(timer); } };
}
