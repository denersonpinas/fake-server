// Regras do UNO (versão oficial para 2-10 jogadores) como funções puras sobre um objeto de estado.
// Nada aqui toca o DOM: a UI e os robôs só chamam estas funções.

export const COLORS = ['red', 'yellow', 'green', 'blue'];
export const COLOR_NAMES = { red: 'Vermelho', yellow: 'Amarelo', green: 'Verde', blue: 'Azul' };

export function buildDeck() {
  const deck = [];
  let id = 0;
  for (const color of COLORS) {
    deck.push({ id: id++, color, kind: 'number', value: 0 });
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: id++, color, kind: 'number', value: n });
      deck.push({ id: id++, color, kind: 'number', value: n });
    }
    for (const kind of ['skip', 'reverse', 'draw2']) {
      deck.push({ id: id++, color, kind, value: null });
      deck.push({ id: id++, color, kind, value: null });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: id++, color: null, kind: 'wild', value: null });
    deck.push({ id: id++, color: null, kind: 'wild4', value: null });
  }
  return deck; // 108 cartas
}

export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const isWild = (c) => c.kind === 'wild' || c.kind === 'wild4';

export function cardPoints(c) {
  if (c.kind === 'number') return c.value;
  return isWild(c) ? 50 : 20;
}

const top = (state) => state.discard[state.discard.length - 1];
const mod = (a, n) => ((a % n) + n) % n;

/** Índice do jogador `steps` posições à frente na direção atual. */
export function nextIndex(state, steps = 1) {
  return mod(state.current + state.dir * steps, state.players.length);
}

/** Carta combina com a mesa? Curinga +4 só vale sem carta da cor atual na mão. */
export function isPlayable(state, card, hand) {
  if (isWild(card)) {
    return card.kind === 'wild4' ? !hand.some((c) => c.color === state.color) : true;
  }
  const t = top(state);
  if (card.color === state.color) return true;
  if (card.kind === 'number') return t.kind === 'number' && t.value === card.value;
  return card.kind === t.kind; // símbolo igual (pular/inverter/+2) em outra cor
}

function ensureDrawPile(state) {
  if (state.draw.length > 0) return true;
  if (state.discard.length <= 1) return false;
  const t = state.discard.pop();
  state.draw = shuffle(state.discard, state.rng);
  state.discard = [t];
  return true;
}

function giveCards(state, idx, n) {
  const got = [];
  for (let i = 0; i < n; i++) {
    if (!ensureDrawPile(state)) break;
    const c = state.draw.pop();
    state.players[idx].hand.push(c);
    got.push(c);
  }
  return got;
}

/**
 * players: [{name, bot?, skill?}]. `first` = quem começa a rodada.
 * Distribui 7 cartas, vira a primeira carta e aplica o efeito dela.
 */
export function createGame(players, { rng = Math.random, first = 0 } = {}) {
  const state = {
    rng,
    players: players.map((p) => ({ name: p.name, bot: !!p.bot, skill: p.skill || 1, hand: [], uno: false })),
    draw: shuffle(buildDeck(), rng),
    discard: [],
    current: first,
    dir: 1,
    color: null,
    phase: 'play', // play | drawn | over
    drawnId: null,
    winner: null,
  };
  for (let i = 0; i < 7; i++) for (let p = 0; p < state.players.length; p++) state.players[p].hand.push(state.draw.pop());

  let card = state.draw.pop();
  while (card.kind === 'wild4') { // +4 não pode abrir a mesa
    state.draw.unshift(card);
    card = state.draw.pop();
  }
  state.discard.push(card);
  state.color = card.color ?? COLORS[Math.floor(rng() * COLORS.length)];

  if (card.kind === 'skip') state.current = nextIndex(state, 1);
  else if (card.kind === 'reverse') { state.dir = -1; state.current = nextIndex(state, 1); }
  else if (card.kind === 'draw2') { giveCards(state, state.current, 2); state.current = nextIndex(state, 1); }
  return state;
}

export function legalMoves(state) {
  const p = state.players[state.current];
  if (state.phase === 'over') return [];
  if (state.phase === 'drawn') return p.hand.filter((c) => c.id === state.drawnId);
  return p.hand.filter((c) => isPlayable(state, c, p.hand));
}

/** Grita UNO — só vale com 2 cartas na mão (antes de jogar a penúltima). */
export function callUno(state, idx = state.current) {
  const p = state.players[idx];
  if (p.hand.length !== 2) return false;
  p.uno = true;
  return true;
}

export function playCard(state, cardId, chosenColor) {
  if (state.phase === 'over') throw new Error('Rodada encerrada');
  const idx = state.current;
  const p = state.players[idx];
  const at = p.hand.findIndex((c) => c.id === cardId);
  if (at < 0) throw new Error('Carta não está na mão');
  const card = p.hand[at];
  if (state.phase === 'drawn' && cardId !== state.drawnId) throw new Error('Só pode jogar a carta comprada');
  if (!isPlayable(state, card, p.hand)) throw new Error('Jogada inválida');
  if (isWild(card) && !COLORS.includes(chosenColor)) throw new Error('Escolha uma cor');

  p.hand.splice(at, 1);
  state.discard.push(card);
  state.color = isWild(card) ? chosenColor : card.color;
  state.phase = 'play';
  state.drawnId = null;
  const events = [{ type: 'play', player: idx, card }];

  if (p.hand.length === 0) {
    state.phase = 'over';
    state.winner = idx;
    events.push({ type: 'win', player: idx });
    return events;
  }
  if (p.hand.length === 1) {
    if (p.uno) events.push({ type: 'uno', player: idx });
    else { giveCards(state, idx, 2); events.push({ type: 'unoPenalty', player: idx }); }
  }
  p.uno = false;

  const n = state.players.length;
  const victim = nextIndex(state, 1);
  switch (card.kind) {
    case 'skip':
      events.push({ type: 'skip', player: victim });
      state.current = nextIndex(state, 2);
      break;
    case 'reverse':
      state.dir *= -1;
      events.push({ type: 'reverse' });
      // Com 2 jogadores, inverter funciona como pular.
      if (n > 2) state.current = nextIndex(state, 1);
      break;
    case 'draw2':
      giveCards(state, victim, 2);
      events.push({ type: 'draw', player: victim, count: 2 });
      state.current = nextIndex(state, 2);
      break;
    case 'wild4':
      giveCards(state, victim, 4);
      events.push({ type: 'draw', player: victim, count: 4 });
      state.current = nextIndex(state, 2);
      break;
    default:
      state.current = nextIndex(state, 1);
  }
  return events;
}

/** Compra 1 carta. Se der para jogá-la, o turno continua (fase `drawn`); senão passa. */
export function drawCard(state) {
  if (state.phase !== 'play') throw new Error('Não pode comprar agora');
  const idx = state.current;
  const [card] = giveCards(state, idx, 1);
  const events = [{ type: 'drawOne', player: idx, card }];
  state.players[idx].uno = false;
  if (card && isPlayable(state, card, state.players[idx].hand)) {
    state.phase = 'drawn';
    state.drawnId = card.id;
  } else {
    state.current = nextIndex(state, 1);
  }
  return events;
}

export function passTurn(state) {
  if (state.phase !== 'drawn') throw new Error('Só pode passar após comprar');
  state.phase = 'play';
  state.drawnId = null;
  state.players[state.current].uno = false;
  state.current = nextIndex(state, 1);
}

/** Pontos do vencedor: soma das cartas que sobraram nas mãos dos outros. */
export function roundPoints(state) {
  return state.players.reduce((sum, p, i) => (i === state.winner ? sum : sum + p.hand.reduce((s, c) => s + cardPoints(c), 0)), 0);
}
