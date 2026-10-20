// Física do pinball: bola, paredes, bumpers, alvos e flippers (capsulas giratórias).
// Mesa 400×700; a raia do lançador fica à direita (x 355–390).

export const W = 400;
export const H = 700;
export const BALL_R = 9;
export const MAX_SPEED = 1700;
export const FLIP_SPEED = 19;      // rad/s
export const SUBSTEPS = 10;
export const LANE_X = 372;
export const LANE_Y = 679;         // posição da bola sobre o lançador
export const DRAIN_Y = H + 25;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function baseWalls() {
  const w = [];
  // arco superior: centro (200,200), raio 190
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a1 = Math.PI + (i / N) * Math.PI, a2 = Math.PI + ((i + 1) / N) * Math.PI;
    w.push({ x1: 200 + 190 * Math.cos(a1), y1: 200 + 190 * Math.sin(a1), x2: 200 + 190 * Math.cos(a2), y2: 200 + 190 * Math.sin(a2), e: 0.35 });
  }
  w.push({ x1: 10, y1: 200, x2: 10, y2: 585, e: 0.45 });                 // parede esquerda
  w.push({ x1: 390, y1: 200, x2: 390, y2: 690, e: 0.45 });               // parede direita (raia)
  w.push({ x1: 355, y1: 690, x2: 355, y2: 255, e: 0.4 });                // divisória da raia
  w.push({ x1: 355, y1: 690, x2: 390, y2: 690, e: 0.1 });                // fundo da raia
  w.push({ x1: 10, y1: 585, x2: 96, y2: 636, e: 0.4 });                  // guia esquerda
  w.push({ x1: 355, y1: 585, x2: 269, y2: 636, e: 0.4 });               // guia direita
  w.push({ x1: 55, y1: 495, x2: 92, y2: 568, e: 0.5, kick: true });      // estilingue esquerdo
  w.push({ x1: 300, y1: 495, x2: 263, y2: 568, e: 0.5, kick: true });    // estilingue direito
  return w;
}

export function createWorld(def) {
  return {
    def,
    gravity: def.gravity,
    walls: [...baseWalls(), ...def.walls.map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2, e: 0.5 }))],
    bumpers: def.bumpers.map(([x, y]) => ({ x, y, r: 19, flash: 0 })),
    targets: def.targets.map(([x, y]) => ({ x, y, r: 8, hit: false, flash: 0 })),
    flippers: [
      { px: 108, py: 640, len: 66, rest: 0.5, up: -0.45, angle: 0.5, omega: 0, pressed: false },
      { px: 257, py: 640, len: 66, rest: Math.PI - 0.5, up: Math.PI + 0.45, angle: Math.PI - 0.5, omega: 0, pressed: false },
    ],
    ball: { x: LANE_X, y: LANE_Y, vx: 0, vy: 0 },
    score: 0,
    mult: 1,
    events: [],
    idle: 0,
  };
}

export function resetBall(world) {
  Object.assign(world.ball, { x: LANE_X, y: LANE_Y, vx: 0, vy: 0 });
  world.mult = 1;
  world.idle = 0;
  for (const t of world.targets) t.hit = false;
}

export const inLane = (b) => b.x > 356 && b.y > 560;

/** Solta o lançador. power 0..1 → velocidade vertical. Retorna true se lançou. */
export function launch(world, power) {
  const b = world.ball;
  if (!inLane(b) || Math.hypot(b.vx, b.vy) > 40) return false;
  b.vy = -(750 + 850 * clamp(power, 0, 1));
  world.events.push('launch');
  return true;
}

export function nudge(world) {
  const b = world.ball;
  if (inLane(b)) return;
  b.vx += (Math.random() - 0.5) * 220;
  b.vy -= 160;
  world.events.push('nudge');
}

export function flipperTip(f) {
  return { x: f.px + Math.cos(f.angle) * f.len, y: f.py + Math.sin(f.angle) * f.len };
}

/** Colisão da bola com uma cápsula (segmento com raio variável). pivot/omega dão a velocidade da superfície. */
function collideCapsule(ball, ax, ay, bx, by, r0, r1, e, pivot = null, omega = 0) {
  const abx = bx - ax, aby = by - ay;
  const t = clamp(((ball.x - ax) * abx + (ball.y - ay) * aby) / (abx * abx + aby * aby), 0, 1);
  const cx = ax + abx * t, cy = ay + aby * t;
  const rad = r0 + (r1 - r0) * t;
  const dx = ball.x - cx, dy = ball.y - cy;
  let d = Math.hypot(dx, dy);
  const minD = BALL_R + rad;
  if (d >= minD) return null;
  let nx, ny;
  if (d < 1e-6) {
    const l = Math.hypot(abx, aby);
    nx = -aby / l; ny = abx / l; d = 0;
  } else { nx = dx / d; ny = dy / d; }
  ball.x += nx * (minD - d);
  ball.y += ny * (minD - d);
  let svx = 0, svy = 0;
  if (pivot) { svx = -omega * (cy - pivot.y); svy = omega * (cx - pivot.x); }
  const vn = (ball.vx - svx) * nx + (ball.vy - svy) * ny;
  if (vn < 0) {
    const j = -(1 + e) * vn;
    ball.vx += j * nx;
    ball.vy += j * ny;
    return { impact: -vn, nx, ny };
  }
  return { impact: 0, nx, ny };
}

function substep(world, dt) {
  const b = world.ball;

  for (const f of world.flippers) {
    const target = f.pressed ? f.up : f.rest;
    const diff = target - f.angle;
    const maxStep = FLIP_SPEED * dt;
    if (Math.abs(diff) <= maxStep) { f.omega = diff / dt; f.angle = target; }
    else { f.omega = Math.sign(diff) * FLIP_SPEED; f.angle += f.omega * dt; }
  }

  b.vy += world.gravity * dt;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  for (const w of world.walls) {
    const hit = collideCapsule(b, w.x1, w.y1, w.x2, w.y2, 2, 2, w.e);
    if (hit && hit.impact > 30) {
      if (w.kick && hit.impact > 60) {
        b.vx += hit.nx * 280;
        b.vy += hit.ny * 280;
        world.score += 10 * world.mult;
        world.events.push('sling');
      } else if (hit.impact > 120) world.events.push('wall');
    }
  }

  for (const f of world.flippers) {
    const tip = flipperTip(f);
    const hit = collideCapsule(b, f.px, f.py, tip.x, tip.y, 8, 5, 0.35, { x: f.px, y: f.py }, f.omega);
    if (hit && hit.impact > 150) world.events.push('flipper');
  }

  for (const bm of world.bumpers) {
    const dx = b.x - bm.x, dy = b.y - bm.y;
    const d = Math.hypot(dx, dy);
    if (d < bm.r + BALL_R && d > 0.001) {
      const nx = dx / d, ny = dy / d;
      b.x = bm.x + nx * (bm.r + BALL_R);
      b.y = bm.y + ny * (bm.r + BALL_R);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) b.vx -= 2 * vn * nx, b.vy -= 2 * vn * ny;
      b.vx += nx * 380;
      b.vy += ny * 380;
      bm.flash = 1;
      world.score += 100 * world.mult;
      world.events.push('bumper');
    }
  }

  let allHit = world.targets.length > 0;
  for (const t of world.targets) {
    if (!t.hit) {
      const dx = b.x - t.x, dy = b.y - t.y;
      const d = Math.hypot(dx, dy);
      if (d < t.r + BALL_R) {
        t.hit = true;
        t.flash = 1;
        world.score += 500 * world.mult;
        world.events.push('target');
        const nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : -1;
        b.x = t.x + nx * (t.r + BALL_R + 0.5); // sai de cima do alvo para não disparar de novo ao resetar
        b.y = t.y + ny * (t.r + BALL_R + 0.5);
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; }
      }
    }
    if (!t.hit) allHit = false;
  }
  if (allHit) {
    world.score += 1000 * world.mult;
    world.mult = Math.min(5, world.mult + 1);
    world.events.push('bonus');
    for (const t of world.targets) t.hit = false;
  }
}

/** Avança a simulação dt segundos. Retorna 'drained' quando a bola cai pelo ralo, senão 'ok'. */
export function step(world, dt) {
  const sub = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    substep(world, sub);
    if (world.ball.y > DRAIN_Y) return 'drained';
  }
  for (const bm of world.bumpers) bm.flash = Math.max(0, bm.flash - dt * 5);
  for (const t of world.targets) t.flash = Math.max(0, t.flash - dt * 4);

  // Anti-travamento: bola parada fora da raia e longe dos flippers ganha um empurrãozinho
  const b = world.ball;
  if (!inLane(b) && Math.hypot(b.vx, b.vy) < 12 && b.y < 600) {
    world.idle += dt;
    if (world.idle > 2.5) { b.vx += (Math.random() - 0.5) * 200; b.vy -= 120; world.idle = 0; }
  } else world.idle = 0;
  return 'ok';
}
