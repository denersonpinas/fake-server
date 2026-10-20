// Robôs do UNO. skill 1 = aleatório, 2 = estratégia básica, 3 = estratégia + pressão no próximo jogador.
import { COLORS, cardPoints, isWild, legalMoves, nextIndex } from './logic.js';

function bestColor(hand, rng) {
  const count = Object.fromEntries(COLORS.map((c) => [c, 0]));
  for (const c of hand) if (c.color) count[c.color]++;
  const max = Math.max(...Object.values(count));
  if (max === 0) return COLORS[Math.floor(rng() * COLORS.length)];
  return COLORS.find((c) => count[c] === max);
}

function rate(state, card, hand, skill) {
  const nextCount = state.players[nextIndex(state, 1)].hand.length;
  const others = hand.filter((c) => c.id !== card.id);
  let s = cardPoints(card) / 10 + state.rng();
  if (isWild(card)) s += others.length <= 1 || (skill === 3 && nextCount <= 2) ? 8 : -6;
  else if (card.kind !== 'number') s += nextCount <= 3 ? 5 : 1;
  if (skill === 3 && card.color) s += others.filter((c) => c.color === card.color).length * 0.4;
  return s;
}

export function chooseMove(state) {
  const p = state.players[state.current];
  const { skill, hand } = p;
  const legal = legalMoves(state);

  if (state.phase === 'drawn') {
    const card = legal[0];
    if (skill === 1 && state.rng() < 0.3) return { type: 'pass' };
    return { type: 'play', cardId: card.id, color: isWild(card) ? bestColor(hand.filter((c) => c.id !== card.id), state.rng) : undefined };
  }
  if (legal.length === 0) return { type: 'draw' };

  let pick;
  if (skill === 1) pick = legal[Math.floor(state.rng() * legal.length)];
  else pick = legal.map((c) => [c, rate(state, c, hand, skill)]).sort((a, b) => b[1] - a[1])[0][0];
  const color = isWild(pick) ? (skill === 1 ? COLORS[Math.floor(state.rng() * 4)] : bestColor(hand.filter((c) => c.id !== pick.id), state.rng)) : undefined;
  return { type: 'play', cardId: pick.id, color };
}
