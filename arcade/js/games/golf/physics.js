// Física do minigolfe: bola circular, obstáculos retangulares (fixos ou móveis), areia, água e buraco.
// Funções puras sobre objetos simples, sem DOM, para poderem ser testadas em Node.

export const W = 800;
export const H = 480;
export const BOUNDS = { x: 20, y: 20, w: 760, h: 440 };
export const BALL_R = 7;
export const HOLE_R = 11;
export const MAX_SPEED = 900;     // px/s com força máxima
export const DT = 1 / 120;
export const GRASS_DRAG = 1.2;    // amortecimento exponencial (1/s)
export const SAND_DRAG = 6;
export const WALL_BOUNCE = 0.8;
export const HOLE_MAX_SPEED = 380; // acima disso a bola passa por cima do buraco
export const STOP_SPEED = 10;
export const MAX_STROKES = 6;      // limite por buraco, como nos campos reais

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function createWorld(hole) {
  return {
    hole,
    t: 0,
    movers: (hole.movers || []).map((m) => ({ ...m, bx: m.x, by: m.y, vx: 0, vy: 0 })),
  };
}

export function updateMovers(world, dt) {
  world.t += dt;
  for (const m of world.movers) {
    const s = Math.sin(world.t * m.speed + (m.phase || 0));
    const nx = m.bx + (m.ax || 0) * s;
    const ny = m.by + (m.ay || 0) * s;
    m.vx = (nx - m.x) / dt;
    m.vy = (ny - m.y) / dt;
    m.x = nx;
    m.y = ny;
  }
}

/** Colisão círculo × retângulo. Retorna a velocidade de impacto (ou null se não tocou). */
function collideRect(b, r, vx = 0, vy = 0) {
  const cx = clamp(b.x, r.x, r.x + r.w);
  const cy = clamp(b.y, r.y, r.y + r.h);
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= BALL_R * BALL_R) return null;
  let nx, ny, pen;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    nx = dx / d; ny = dy / d; pen = BALL_R - d;
  } else { // centro dentro do retângulo: empurra pelo lado mais próximo
    const l = b.x - r.x, rr = r.x + r.w - b.x, t = b.y - r.y, bt = r.y + r.h - b.y;
    const m = Math.min(l, rr, t, bt);
    if (m === l) { nx = -1; ny = 0; pen = l + BALL_R; }
    else if (m === rr) { nx = 1; ny = 0; pen = rr + BALL_R; }
    else if (m === t) { nx = 0; ny = -1; pen = t + BALL_R; }
    else { nx = 0; ny = 1; pen = bt + BALL_R; }
  }
  b.x += nx * pen;
  b.y += ny * pen;
  const vn = (b.vx - vx) * nx + (b.vy - vy) * ny;
  if (vn < 0) {
    const j = -(1 + WALL_BOUNCE) * vn;
    b.vx += j * nx;
    b.vy += j * ny;
    return -vn;
  }
  return 0;
}

/**
 * Avança a bola um passo. Retorna { status, impact } onde status ∈ 'moving' | 'rest' | 'sunk' | 'water'.
 * `ball` = {x, y, vx, vy}. Chame updateMovers(world, dt) antes, uma vez por passo.
 */
export function stepBall(world, ball, dt = DT) {
  const h = world.hole;
  let impact = 0;

  const drag = (h.sand || []).some((r) => inRect(r, ball.x, ball.y)) ? SAND_DRAG : GRASS_DRAG;
  const k = Math.exp(-drag * dt);
  ball.vx *= k;
  ball.vy *= k;

  // Atração suave do buraco quando a bola chega devagar
  const hx = h.hole.x - ball.x, hy = h.hole.y - ball.y;
  const hd = Math.hypot(hx, hy);
  const speed0 = Math.hypot(ball.vx, ball.vy);
  if (hd < HOLE_R * 1.8 && speed0 < HOLE_MAX_SPEED * 1.2 && hd > 0.01) {
    ball.vx += (hx / hd) * 500 * dt;
    ball.vy += (hy / hd) * 500 * dt;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const b = BOUNDS;
  if (ball.x < b.x + BALL_R) { ball.x = b.x + BALL_R; ball.vx = Math.abs(ball.vx) * WALL_BOUNCE; impact = Math.max(impact, Math.abs(ball.vx)); }
  if (ball.x > b.x + b.w - BALL_R) { ball.x = b.x + b.w - BALL_R; ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE; impact = Math.max(impact, Math.abs(ball.vx)); }
  if (ball.y < b.y + BALL_R) { ball.y = b.y + BALL_R; ball.vy = Math.abs(ball.vy) * WALL_BOUNCE; impact = Math.max(impact, Math.abs(ball.vy)); }
  if (ball.y > b.y + b.h - BALL_R) { ball.y = b.y + b.h - BALL_R; ball.vy = -Math.abs(ball.vy) * WALL_BOUNCE; impact = Math.max(impact, Math.abs(ball.vy)); }

  for (const r of h.blocks || []) impact = Math.max(impact, collideRect(ball, r) || 0);
  for (const m of world.movers) impact = Math.max(impact, collideRect(ball, m, m.vx, m.vy) || 0);

  for (const w of h.water || []) {
    if (inRect({ x: w.x + 3, y: w.y + 3, w: w.w - 6, h: w.h - 6 }, ball.x, ball.y)) return { status: 'water', impact };
  }

  const speed = Math.hypot(ball.vx, ball.vy);
  if (hd < HOLE_R && speed < HOLE_MAX_SPEED) return { status: 'sunk', impact };

  if (speed < STOP_SPEED) {
    ball.vx = 0;
    ball.vy = 0;
    return { status: 'rest', impact };
  }
  return { status: 'moving', impact };
}

/** Converte um arrasto (vetor do dedo/mouse) em velocidade inicial; a bola sai no sentido oposto. */
export function shotVelocity(dragX, dragY, maxDrag = 150) {
  const len = Math.hypot(dragX, dragY);
  if (len < 1) return { vx: 0, vy: 0, power: 0 };
  const power = Math.min(len, maxDrag) / maxDrag;
  return { vx: (-dragX / len) * power * MAX_SPEED, vy: (-dragY / len) * power * MAX_SPEED, power };
}

/** Simula uma tacada até parar. Usado nos testes e na verificação de fases. */
export function simulateShot(hole, from, angle, power, { world = createWorld(hole), maxSeconds = 25 } = {}) {
  const ball = { x: from.x, y: from.y, vx: Math.cos(angle) * power * MAX_SPEED, vy: Math.sin(angle) * power * MAX_SPEED };
  const steps = Math.ceil(maxSeconds / DT);
  for (let i = 0; i < steps; i++) {
    updateMovers(world, DT);
    const r = stepBall(world, ball, DT);
    if (r.status !== 'moving') return { status: r.status, x: ball.x, y: ball.y };
  }
  return { status: 'rest', x: ball.x, y: ball.y };
}
