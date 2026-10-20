import { h, toast } from '../../ui.js';
import { beep, jingle } from '../../sfx.js';
import { loadImages, makePattern } from '../../assets.js';
import { COURSES } from './levels.js';
import { W, H, BOUNDS, BALL_R, HOLE_R, DT, MAX_STROKES, createWorld, updateMovers, stepBall, shotVelocity } from './physics.js';

const BALL_COLORS = ['#f1f5f9', '#f59e0b'];

const strokeLabel = (s, par) => {
  if (s === 1) return 'Hole in one! 🎯';
  const d = s - par;
  return d <= -2 ? 'Eagle 🦅' : d === -1 ? 'Birdie 🐦' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : d === 2 ? 'Duplo bogey' : `+${d}`;
};

export function mount(root, { mode, level, names, onFinish }) {
  const course = COURSES[level - 1];
  const nHoles = course.holes.length;
  const players = names.map((name, i) => ({
    name, color: BALL_COLORS[i],
    strokes: Array(nHoles).fill(0), done: false,
    ball: { x: 0, y: 0, vx: 0, vy: 0 }, last: { x: 0, y: 0 },
  }));
  let holeIdx = 0;
  let world = null;
  let turn = 0;
  let order = players.map((_, i) => i);
  let phase = 'aim'; // aim | roll | sink | between
  let drag = null;
  let sink = null;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let destroyed = false;

  const canvas = h('canvas', { width: W * 2, height: H * 2, 'aria-label': 'Campo de minigolfe' });
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  const hud = h('div', { class: 'golf-hud' });
  const overlay = h('div', { class: 'golf-overlay', hidden: true });
  root.replaceChildren(h('div', { class: 'golf' }, hud, h('div', { class: 'canvas-wrap golf-wrap' }, canvas, overlay)));

  const hole = () => course.holes[holeIdx];
  const total = (p, upTo = nHoles) => p.strokes.slice(0, upTo).reduce((a, b) => a + b, 0);

  function renderHud() {
    const hl = hole();
    hud.replaceChildren(
      h('div', { class: 'golf-info' }, h('strong', null, `Buraco ${holeIdx + 1}/${nHoles} · ${hl.name}`), h('span', null, `Par ${hl.par}`)),
      h('table', { class: 'score' },
        h('tr', null, h('th', null, ''), h('th', null, 'Buraco'), h('th', null, 'Total'), h('th', null, 'Par')),
        players.map((p, i) => h('tr', { class: i === turn && phase !== 'between' ? 'turn' : '' },
          h('td', null, h('i', { class: 'dot', style: { background: p.color } }), p.name),
          h('td', null, p.strokes[holeIdx]), h('td', null, total(p)), h('td', null, course.holes.slice(0, holeIdx + (p.done ? 1 : 0)).reduce((a, x) => a + x.par, 0))))));
  }

  function startHole() {
    world = createWorld(hole());
    for (const p of players) {
      p.done = false;
      p.ball = { x: hole().tee.x, y: hole().tee.y, vx: 0, vy: 0 };
      p.last = { x: hole().tee.x, y: hole().tee.y };
    }
    overlay.hidden = true;
    pickNext(true);
  }

  const dist = (p) => Math.hypot(p.ball.x - hole().hole.x, p.ball.y - hole().hole.y);

  /** Quem joga: o mais longe do buraco (regra do golfe); empate → ordem de honra. */
  function pickNext(first = false) {
    const pending = players.map((p, i) => i).filter((i) => !players[i].done);
    if (!pending.length) return endHole();
    pending.sort((a, b) => (Math.abs(dist(players[b]) - dist(players[a])) > 1 ? dist(players[b]) - dist(players[a]) : order.indexOf(a) - order.indexOf(b)));
    const prev = turn;
    turn = pending[0];
    phase = 'aim';
    renderHud();
    if (players.length > 1 && (first || turn !== prev)) toast(`Vez de ${players[turn].name}`, 1100);
    else if (first) toast(`${hole().name} — Par ${hole().par}`, 1300);
  }

  function shoot(vx, vy) {
    const p = players[turn];
    p.last = { x: p.ball.x, y: p.ball.y };
    p.ball.vx = vx; p.ball.vy = vy;
    p.strokes[holeIdx]++;
    phase = 'roll';
    beep(180 + Math.hypot(vx, vy) / 5, 0.07, 'triangle', 0.06);
    renderHud();
  }

  function settle(p) {
    if (p.strokes[holeIdx] >= MAX_STROKES) {
      p.strokes[holeIdx] = MAX_STROKES;
      p.done = true;
      toast(`${p.name}: limite de ${MAX_STROKES} tacadas`, 1500);
    }
    pickNext();
  }

  function onResult(r) {
    const p = players[turn];
    if (r.impact > 120) beep(120 + Math.min(r.impact, 700) / 4, 0.04, 'square', 0.03);
    if (r.status === 'sunk') {
      phase = 'sink';
      sink = { t: 0, from: { x: p.ball.x, y: p.ball.y } };
      p.done = true;
      jingle([660, 880]);
    } else if (r.status === 'water') {
      toast(`💦 ${p.name} caiu na água! +1 tacada`, 1500);
      beep(160, 0.25, 'sawtooth');
      p.strokes[holeIdx]++;
      p.ball = { x: p.last.x, y: p.last.y, vx: 0, vy: 0 };
      settle(p);
    } else if (r.status === 'rest') {
      settle(p);
    }
  }

  function endHole() {
    phase = 'between';
    renderHud();
    const hl = hole();
    const lines = players.map((p) => h('li', null, h('i', { class: 'dot', style: { background: p.color } }), `${p.name}: ${p.strokes[holeIdx]} tacada(s) — ${strokeLabel(p.strokes[holeIdx], hl.par)}`));
    const lastHole = holeIdx === nHoles - 1;
    order = [...order].sort((a, b) => players[a].strokes[holeIdx] - players[b].strokes[holeIdx] || order.indexOf(a) - order.indexOf(b));
    overlay.replaceChildren(h('div', { class: 'card-pop' }, h('h2', null, `Buraco ${holeIdx + 1} concluído`), h('ul', null, lines),
      h('button', { class: 'btn primary', onClick: () => (lastHole ? finishCourse() : (holeIdx++, startHole())) }, lastHole ? 'Ver resultado' : 'Próximo buraco ▶')));
    overlay.hidden = false;
  }

  function finishCourse() {
    overlay.hidden = true;
    const par = course.holes.reduce((a, x) => a + x.par, 0);
    const totals = players.map((p) => total(p));
    const lines = players.map((p, i) => `${p.name}: ${totals[i]} tacadas (par ${par})`);
    const best = Math.min(...totals);
    const winners = players.filter((_, i) => totals[i] === best);
    const diff = best - par;
    const stars = diff <= 0 ? 3 : diff <= 3 ? 2 : 1;
    jingle([523, 659, 784, 1046]);
    onFinish({
      won: true, stars,
      title: players.length > 1 ? (winners.length > 1 ? 'Empate! 🤝' : `${winners[0].name} venceu! 🏆`) : diff <= 0 ? 'Campo dominado! ⛳' : 'Campo concluído!',
      lines,
    });
  }

  /* ---------- Entrada ---------- */
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (phase !== 'aim') return;
    canvas.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y };
  });
  canvas.addEventListener('pointermove', (e) => { if (drag) { const p = toLocal(e); drag.cx = p.x; drag.cy = p.y; } });
  const release = () => {
    if (!drag) return;
    const { vx, vy, power } = shotVelocity(drag.cx - drag.sx, drag.cy - drag.sy);
    drag = null;
    if (phase === 'aim' && power > 0.07) shoot(vx, vy);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { drag = null; });

  /* ---------- Laço principal ---------- */
  function frame(ts) {
    if (destroyed) return;
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    acc += dt;
    while (acc >= DT) {
      acc -= DT;
      updateMovers(world, DT);
      if (phase === 'roll') {
        const r = stepBall(world, players[turn].ball, DT);
        if (r.status !== 'moving' || r.impact > 120) onResult(r);
        if (phase !== 'roll') break;
      }
    }
    if (phase === 'sink') {
      sink.t += dt;
      if (sink.t > 0.6) { sink = null; phase = 'aim'; pickNext(); }
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Desenho (texturas e sprites SVG em assets/golf) ---------- */
  let IM = null;
  let PAT = null;

  function rr(x, y, w, h2, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h2, r); }

  function draw() {
    const hl = hole();
    const t = performance.now() / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#16351f'; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = PAT.grass; ctx.fillRect(BOUNDS.x, BOUNDS.y, BOUNDS.w, BOUNDS.h);
    ctx.lineWidth = 5; ctx.strokeStyle = '#6b4a2b'; ctx.strokeRect(BOUNDS.x - 2.5, BOUNDS.y - 2.5, BOUNDS.w + 5, BOUNDS.h + 5);

    for (const s of hl.sand || []) {
      rr(s.x, s.y, s.w, s.h, 14); ctx.fillStyle = PAT.sand; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(150,110,40,.55)'; ctx.stroke();
    }
    for (const wt of hl.water || []) {
      PAT.water.setTransform(new DOMMatrix().translate((t * 14) % 64, 0).scale(0.5)); // ondas deslizando
      rr(wt.x, wt.y, wt.w, wt.h, 10); ctx.fillStyle = PAT.water; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(190,225,255,.7)'; ctx.stroke();
    }

    // tee, buraco e bandeira
    const hh = hl.hole;
    ctx.drawImage(IM.tee, hl.tee.x - 18, hl.tee.y - 18, 36, 36);
    ctx.drawImage(IM.hole, hh.x - 21, hh.y - 21, 42, 42);

    for (const b of hl.blocks || []) {
      rr(b.x, b.y, b.w, b.h, 4); ctx.fillStyle = PAT.wood; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#5b3a17'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,235,200,.22)'; ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, Math.min(4, b.h - 4));
    }
    for (const m of world.movers) {
      rr(m.x, m.y, m.w, m.h, 4); ctx.fillStyle = PAT.hazard; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#b5432a'; ctx.stroke();
    }

    // bolas
    players.forEach((p, i) => {
      if (p.done && !(sink && i === turn)) return;
      let { x, y } = p.ball; let r = BALL_R;
      if (sink && i === turn) { const k = Math.min(1, sink.t / 0.5); x = sink.from.x + (hh.x - sink.from.x) * k; y = sink.from.y + (hh.y - sink.from.y) * k; r = BALL_R * (1 - k * 0.8); }
      const active = i === turn && phase === 'aim' && players.length > 1;
      if (active) { ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, r, r * 0.8, 0, 0, 7); ctx.fill();
      ctx.drawImage(i === 0 ? IM.ball : IM.ballAmber, x - r, y - r, r * 2, r * 2);
    });

    ctx.drawImage(IM.flag, hh.x - 8, hh.y - 56, 44, 60); // por cima da bola que cai no buraco

    // mira
    if (drag && phase === 'aim') {
      const p = players[turn].ball;
      const { vx, vy, power } = shotVelocity(drag.cx - drag.sx, drag.cy - drag.sy);
      const len = Math.hypot(vx, vy) || 1;
      const ux = vx / len, uy = vy / len;
      const L = 30 + power * 150;
      const col = `hsl(${120 - power * 120},90%,60%)`;
      ctx.setLineDash([6, 6]); ctx.lineWidth = 3; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + ux * L, p.y + uy * L); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x + ux * L, p.y + uy * L, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.fillText(`${Math.round(power * 100)}%`, p.x + 12, p.y - 12);
    } else if (phase === 'aim') {
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Arraste para trás e solte', W / 2, H - 4); ctx.textAlign = 'start';
    }
  }

  loadImages({
    ball: 'golf/ball.svg', ballAmber: 'golf/ball-amber.svg', hole: 'golf/hole.svg', flag: 'golf/flag.svg', tee: 'golf/tee.svg',
    grass: 'golf/grass.svg', sand: 'golf/sand.svg', water: 'golf/water.svg', wood: 'golf/wood.svg', hazard: 'golf/hazard.svg',
  }).then((imgs) => {
    if (destroyed) return;
    IM = imgs;
    PAT = { grass: makePattern(ctx, IM.grass), sand: makePattern(ctx, IM.sand), water: makePattern(ctx, IM.water), wood: makePattern(ctx, IM.wood), hazard: makePattern(ctx, IM.hazard) };
    startHole();
    raf = requestAnimationFrame(frame);
  }).catch((e) => { root.textContent = e.message; });

  return { destroy() { destroyed = true; cancelAnimationFrame(raf); } };
}
