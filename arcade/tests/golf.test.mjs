import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../js/games/golf/levels.js';
import { createWorld, simulateShot, shotVelocity, stepBall, DT, BALL_R, BOUNDS, MAX_SPEED } from '../js/games/golf/physics.js';

const inside = (h, x, y) => (h.blocks || []).some((b) => x > b.x - BALL_R && x < b.x + b.w + BALL_R && y > b.y - BALL_R && y < b.y + b.h + BALL_R);

test('bola desacelera e para na grama', () => {
  const hole = { tee: { x: 100, y: 240 }, hole: { x: 780, y: 450 }, blocks: [] };
  const r = simulateShot(hole, hole.tee, 0, 0.3);
  assert.equal(r.status, 'rest');
  assert.ok(r.x > 100 && r.x < 600);
});

test('areia freia mais que grama', () => {
  const base = { tee: { x: 100, y: 240 }, hole: { x: 780, y: 450 }, blocks: [] };
  const grass = simulateShot(base, base.tee, 0, 0.4);
  const sand = simulateShot({ ...base, sand: [{ x: 0, y: 0, w: 800, h: 480 }] }, base.tee, 0, 0.4);
  assert.ok(sand.x < grass.x - 100);
});

test('parede rebate e a bola nunca sai do campo', () => {
  const hole = { tee: { x: 400, y: 240 }, hole: { x: 30, y: 30 }, blocks: [{ x: 300, y: 100, w: 50, h: 50 }] };
  for (let a = 0; a < 360; a += 15) {
    const r = simulateShot(hole, hole.tee, (a * Math.PI) / 180, 1);
    assert.ok(r.x >= BOUNDS.x && r.x <= BOUNDS.x + BOUNDS.w && r.y >= BOUNDS.y && r.y <= BOUNDS.y + BOUNDS.h);
  }
});

test('bola lenta cai no buraco; rápida passa por cima', () => {
  const hole = { tee: { x: 100, y: 240 }, hole: { x: 300, y: 240 }, blocks: [] };
  const slow = { x: 285, y: 240, vx: 120, vy: 0 };
  const w = createWorld(hole);
  let s; for (let i = 0; i < 400 && (s = stepBall(w, slow, DT)).status === 'moving'; i++);
  assert.equal(s.status, 'sunk');
  const fast = { x: 285, y: 240, vx: 800, vy: 0 };
  assert.equal(stepBall(createWorld(hole), fast, DT).status, 'moving');
});

test('água é detectada', () => {
  const hole = { tee: { x: 100, y: 240 }, hole: { x: 700, y: 240 }, blocks: [], water: [{ x: 300, y: 100, w: 100, h: 300 }] };
  assert.equal(simulateShot(hole, hole.tee, 0, 0.6).status, 'water');
});

test('shotVelocity: sentido oposto ao arrasto e força limitada', () => {
  const v = shotVelocity(-300, 0);
  assert.ok(v.vx > 0 && Math.abs(v.vx - MAX_SPEED) < 1e-6 && v.power === 1);
});

// Garante que todo buraco é possível: busca em largura sobre posições de repouso (grade de 40px).
function solvable(h, maxStrokes) {
  const key = (p) => `${Math.round(p.x / 40)},${Math.round(p.y / 40)}`;
  const world = createWorld(h);
  let frontier = [h.tee];
  const seen = new Set([key(h.tee)]);
  for (let stroke = 1; stroke <= maxStrokes; stroke++) {
    const next = [];
    for (const p of frontier) {
      for (let a = 0; a < 360; a += 10) {
        for (const power of [0.25, 0.5, 0.8, 1]) {
          const r = simulateShot(h, p, (a * Math.PI) / 180, power, { world, maxSeconds: 12 });
          if (r.status === 'sunk') return stroke;
          if (r.status === 'rest' && !seen.has(key(r))) { seen.add(key(r)); next.push(r); }
        }
      }
    }
    frontier = next;
  }
  return 0;
}

for (const course of COURSES) {
  for (const h of course.holes) {
    test(`${course.title} · ${h.name}: tee/buraco livres e solucionável em ≤ ${h.par + 2} tacadas`, () => {
      assert.ok(!inside(h, h.tee.x, h.tee.y), 'tee dentro de bloco');
      assert.ok(!inside(h, h.hole.x, h.hole.y), 'buraco dentro de bloco');
      assert.ok(!(h.water || []).some((w) => h.tee.x > w.x && h.tee.x < w.x + w.w && h.tee.y > w.y && h.tee.y < w.y + w.h), 'tee na água');
      const n = solvable(h, h.par + 2);
      assert.ok(n > 0, 'sem solução');
    });
  }
}
