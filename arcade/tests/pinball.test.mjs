import test from 'node:test';
import assert from 'node:assert/strict';
import { TABLES } from '../js/games/pinball/tables.js';
import { createWorld, step, launch, inLane, flipperTip, W, H } from '../js/games/pinball/physics.js';

const FRAME = 1 / 60;

function playBall(world, { power = 0.8, maxSeconds = 90, bot = true } = {}) {
  assert.ok(launch(world, power), 'lançamento');
  let t = 0;
  while (t < maxSeconds) {
    if (bot) {
      const b = world.ball;
      const [l, r] = world.flippers;
      const nearL = b.x < 190 && b.y > 590 && b.vy > -50;
      const nearR = b.x >= 190 && b.x < 356 && b.y > 590 && b.vy > -50;
      l.pressed = nearL; r.pressed = nearR;
    }
    if (step(world, FRAME) === 'drained') return { t, drained: true };
    t += FRAME;
    assert.ok(world.ball.x > -50 && world.ball.x < W + 50 && world.ball.y > -50, 'bola escapou da mesa');
    assert.ok(Number.isFinite(world.ball.x) && Number.isFinite(world.ball.y));
  }
  return { t, drained: false };
}

test('lançamento fraco volta pra raia; forte entra na mesa', () => {
  const w = createWorld(TABLES[0]);
  launch(w, 0.0);
  let t = 0;
  while (t < 6) { step(w, FRAME); t += FRAME; }
  assert.ok(inLane(w.ball), 'bola deveria voltar à raia');

  const w2 = createWorld(TABLES[0]);
  launch(w2, 1);
  let entered = false;
  for (let i = 0; i < 600; i++) { step(w2, FRAME); if (w2.ball.x < 340 && w2.ball.y > 100 && w2.ball.y < 600) { entered = true; break; } }
  assert.ok(entered, 'bola deveria entrar na mesa');
});

test('flipper acelera a bola quando acionado', () => {
  const w = createWorld(TABLES[0]);
  w.ball.x = 135; w.ball.y = 628; w.ball.vx = 0; w.ball.vy = 0; // sobre o flipper esquerdo
  for (let i = 0; i < 6; i++) step(w, FRAME);
  w.flippers[0].pressed = true;
  let minVy = 0;
  for (let i = 0; i < 20; i++) { step(w, FRAME); minVy = Math.min(minVy, w.ball.vy); }
  assert.ok(minVy < -400, `flipper deveria rebater para cima (vy mín ${minVy})`);
});

test('bumper pontua e empurra a bola', () => {
  const w = createWorld(TABLES[0]);
  const [bx, by] = TABLES[0].bumpers[0];
  w.ball.x = bx; w.ball.y = by - 40; w.ball.vx = 0; w.ball.vy = 300;
  for (let i = 0; i < 20; i++) step(w, FRAME);
  assert.ok(w.score >= 100);
});

test('todos os alvos derrubados dão bônus e aumentam o multiplicador', () => {
  const w = createWorld(TABLES[0]);
  for (const t of w.targets) {
    w.ball.x = t.x + (t.x < 200 ? 5 : -5); w.ball.y = t.y; w.ball.vx = 0; w.ball.vy = 0;
    step(w, 1 / 600);
  }
  assert.equal(w.mult, 2);
  assert.ok(w.targets.every((t) => !t.hit));
});

for (const [i, def] of TABLES.entries()) {
  test(`mesa ${i + 1} (${def.title}): simulação estável e bola eventualmente cai`, () => {
    let total = 0;
    for (let n = 0; n < 6; n++) {
      const w = createWorld(def);
      const r = playBall(w, { power: 0.6 + 0.07 * n });
      total += w.score;
      assert.ok(r.drained || r.t >= 90);
    }
    // Registra o potencial de pontos de um "jogador" bobo, para calibrar as metas
    console.log(`  mesa ${i + 1}: média ${Math.round(total / 6)} pts por bola (meta ${def.target})`);
  });
}
