import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, createGame, playCard, drawCard, passTurn, isPlayable, callUno, roundPoints, COLORS } from '../js/games/uno/logic.js';
import { chooseMove } from '../js/games/uno/ai.js';

function rngSeed(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }
const total = (s) => s.draw.length + s.discard.length + s.players.reduce((n, p) => n + p.hand.length, 0);

test('baralho tem 108 cartas', () => {
  const d = buildDeck();
  assert.equal(d.length, 108);
  assert.equal(d.filter((c) => c.kind === 'wild4').length, 4);
  assert.equal(new Set(d.map((c) => c.id)).size, 108);
});

test('jogo começa com 7 cartas e carta inicial válida', () => {
  const g = createGame([{ name: 'A' }, { name: 'B' }], { rng: rngSeed(1) });
  assert.ok(g.players.every((p) => p.hand.length >= 7));
  assert.notEqual(g.discard[0].kind, 'wild4');
  assert.ok(COLORS.includes(g.color));
});

function fixed(hands, topCard, color = topCard.color) {
  const g = createGame(hands.map((_, i) => ({ name: 'P' + i })), { rng: rngSeed(7) });
  let id = 1000;
  const mk = (c) => ({ id: id++, value: null, ...c });
  g.players.forEach((p, i) => (p.hand = hands[i].map(mk)));
  g.discard = [mk(topCard)];
  g.color = color; g.current = 0; g.dir = 1; g.phase = 'play';
  return g;
}

test('combinação por cor, número e símbolo', () => {
  const g = fixed([[{ color: 'red', kind: 'number', value: 3 }]], { color: 'blue', kind: 'number', value: 5 });
  const mk = (c) => ({ id: 1, value: null, ...c });
  assert.equal(isPlayable(g, mk({ color: 'blue', kind: 'number', value: 1 }), []), true);
  assert.equal(isPlayable(g, mk({ color: 'red', kind: 'number', value: 5 }), []), true);
  assert.equal(isPlayable(g, mk({ color: 'red', kind: 'number', value: 4 }), []), false);
  assert.equal(isPlayable(g, mk({ color: 'red', kind: 'skip' }), []), false);
});

test('+4 só com a mão sem a cor atual', () => {
  const g = fixed([[]], { color: 'blue', kind: 'number', value: 5 });
  const w4 = { id: 9, color: null, kind: 'wild4', value: null };
  assert.equal(isPlayable(g, w4, [{ color: 'blue', kind: 'number', value: 1 }]), false);
  assert.equal(isPlayable(g, w4, [{ color: 'red', kind: 'number', value: 1 }]), true);
});

test('pular, +2 e inverter (3 jogadores)', () => {
  let g = fixed([[{ color: 'red', kind: 'skip' }, { color: 'red', kind: 'number', value: 1 }], [{ color: 'red', kind: 'number', value: 2 }], [{ color: 'red', kind: 'number', value: 3 }]], { color: 'red', kind: 'number', value: 9 });
  playCard(g, g.players[0].hand[0].id);
  assert.equal(g.current, 2);

  g = fixed([[{ color: 'red', kind: 'draw2' }, { color: 'blue', kind: 'number', value: 1 }], [{ color: 'red', kind: 'number', value: 2 }], [{ color: 'red', kind: 'number', value: 3 }]], { color: 'red', kind: 'number', value: 9 });
  playCard(g, g.players[0].hand[0].id);
  assert.equal(g.players[1].hand.length, 3);
  assert.equal(g.current, 2);

  g = fixed([[{ color: 'red', kind: 'reverse' }, { color: 'blue', kind: 'number', value: 1 }], [{ color: 'red', kind: 'number', value: 2 }], [{ color: 'red', kind: 'number', value: 3 }]], { color: 'red', kind: 'number', value: 9 });
  playCard(g, g.players[0].hand[0].id);
  assert.equal(g.dir, -1);
  assert.equal(g.current, 2);
});

test('inverter com 2 jogadores joga de novo', () => {
  const g = fixed([[{ color: 'red', kind: 'reverse' }, { color: 'blue', kind: 'number', value: 1 }], [{ color: 'red', kind: 'number', value: 2 }]], { color: 'red', kind: 'number', value: 9 });
  playCard(g, g.players[0].hand[0].id);
  assert.equal(g.current, 0);
});

test('curinga exige cor e +4 faz comprar 4', () => {
  const g = fixed([[{ color: null, kind: 'wild4' }, { color: 'red', kind: 'number', value: 1 }], [{ color: 'red', kind: 'number', value: 2 }]], { color: 'blue', kind: 'number', value: 9 });
  const id = g.players[0].hand[0].id;
  assert.throws(() => playCard(g, id));
  playCard(g, id, 'green');
  assert.equal(g.color, 'green');
  assert.equal(g.players[1].hand.length, 5);
  assert.equal(g.current, 0);
});

test('UNO: esquecer de gritar custa 2 cartas', () => {
  let g = fixed([[{ color: 'red', kind: 'number', value: 1 }, { color: 'red', kind: 'number', value: 2 }], [{ color: 'red', kind: 'number', value: 5 }]], { color: 'red', kind: 'number', value: 9 });
  playCard(g, g.players[0].hand[0].id);
  assert.equal(g.players[0].hand.length, 3);

  g = fixed([[{ color: 'red', kind: 'number', value: 1 }, { color: 'red', kind: 'number', value: 2 }], [{ color: 'red', kind: 'number', value: 5 }]], { color: 'red', kind: 'number', value: 9 });
  assert.equal(callUno(g), true);
  playCard(g, g.players[0].hand[0].id);
  assert.equal(g.players[0].hand.length, 1);
});

test('comprar: joga a carta comprada ou passa', () => {
  const g = fixed([[{ color: 'blue', kind: 'number', value: 1 }], [{ color: 'red', kind: 'number', value: 2 }]], { color: 'red', kind: 'number', value: 9 });
  g.draw.push({ id: 5000, color: 'red', kind: 'number', value: 4 });
  drawCard(g);
  assert.equal(g.phase, 'drawn');
  assert.throws(() => playCard(g, g.players[0].hand[0].id));
  passTurn(g);
  assert.equal(g.current, 1);

  g.draw.push({ id: 5001, color: 'blue', kind: 'number', value: 4 });
  g.current = 0;
  drawCard(g);
  assert.equal(g.phase, 'play');
  assert.equal(g.current, 1);
});

test('vitória e pontuação', () => {
  const g = fixed([[{ color: 'red', kind: 'number', value: 1 }], [{ color: 'blue', kind: 'skip' }, { color: null, kind: 'wild' }]], { color: 'red', kind: 'number', value: 9 });
  playCard(g, g.players[0].hand[0].id);
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 0);
  assert.equal(roundPoints(g), 70);
});

test('reembaralha o descarte quando o monte acaba', () => {
  const g = fixed([[{ color: 'blue', kind: 'number', value: 1 }], [{ color: 'red', kind: 'number', value: 2 }]], { color: 'red', kind: 'number', value: 9 });
  g.discard.unshift({ id: 7000, color: 'green', kind: 'number', value: 2 }, { id: 7001, color: 'green', kind: 'number', value: 3 });
  g.draw = [];
  drawCard(g);
  assert.equal(g.players[0].hand.length, 2);
  assert.equal(g.discard.length, 1);
});

test('partidas completas entre robôs terminam e conservam 108 cartas', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rng = rngSeed(seed);
    const n = 2 + (seed % 3);
    const g = createGame(Array.from({ length: n }, (_, i) => ({ name: 'B' + i, bot: true, skill: 1 + ((seed + i) % 3) })), { rng });
    let guard = 0;
    while (g.phase !== 'over' && guard++ < 3000) {
      const p = g.players[g.current];
      const m = chooseMove(g);
      if (m.type === 'draw') drawCard(g);
      else if (m.type === 'pass') passTurn(g);
      else { if (p.hand.length === 2) callUno(g); playCard(g, m.cardId, m.color); }
      assert.equal(total(g), 108);
    }
    assert.equal(g.phase, 'over', `seed ${seed} não terminou`);
  }
});
