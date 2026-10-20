import { h, toast } from '../../ui.js';
import { beep, jingle } from '../../sfx.js';
import { TABLES } from './tables.js';
import { W, H, BALL_R, createWorld, resetBall, step, launch, nudge, inLane, flipperTip } from './physics.js';

const BALLS = 3;
const MAX_NUDGES = 3;
const fmt = (n) => Math.round(n).toLocaleString('pt-BR');

export function mount(root, { mode, level, names, onFinish }) {
  const def = TABLES[level - 1];
  const world = createWorld(def);
  const players = names.map((name) => ({ name, score: 0, used: 0 }));
  const duo = players.length > 1;
  let turn = 0;
  let phase = 'ready'; // ready | play | wait | over
  let charge = 0;
  let charging = false;
  let saveLeft = 0;     // "bola salva" logo após o lançamento
  let saveUsed = false; // só uma bola salva por bola
  let nudges = 0;
  let restTimer = 0;
  let raf = 0;
  let last = 0;
  let destroyed = false;
  const keys = { left: false, right: false };
  const touches = { left: new Set(), right: new Set() };

  const canvas = h('canvas', { width: W * 2, height: H * 2, 'aria-label': 'Mesa de pinball' });
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const scoreEl = h('strong', { class: 'pin-score' }, '0');
  const ballEl = h('span', null);
  const multEl = h('span', { class: 'pin-mult' });
  const bar = h('i', null);
  const goalBar = h('i', null);
  const msg = h('div', { class: 'pin-msg' });
  const plunger = h('button', { class: 'plunger-btn', 'aria-label': 'Lançar bola (segure e solte)' }, 'LANÇAR');
  const zoneL = h('div', { class: 'zone left' }, h('span', null, '◀'));
  const zoneR = h('div', { class: 'zone right' }, h('span', null, '▶'));
  const nudgeBtn = h('button', { class: 'nudge-btn', 'aria-label': 'Empurrar a mesa' }, '⤒');

  root.replaceChildren(h('div', { class: 'pinball' },
    h('div', { class: 'pin-hud' },
      h('div', { class: 'pin-line' }, h('span', { class: 'pin-who' }), scoreEl, multEl),
      h('div', { class: 'pin-line small' }, ballEl, !duo && h('span', null, `Meta ${fmt(def.target)}`), h('span', { class: 'bars' }, h('span', { class: 'bar goal', title: 'Progresso da meta' }, goalBar), h('span', { class: 'bar', title: 'Força do lançamento' }, bar)))),
    h('div', { class: 'canvas-wrap pin-wrap' }, canvas, zoneL, zoneR, plunger, nudgeBtn, msg)));
  const whoEl = root.querySelector('.pin-who');

  function setMsg(text) { msg.textContent = text || ''; msg.hidden = !text; }

  function startTurn() {
    resetBall(world);
    world.score = players[turn].score;
    phase = 'ready';
    charge = 0; charging = false; nudges = 0; saveLeft = 0; saveUsed = false; restTimer = 0;
    setMsg(`${duo ? players[turn].name + ' · ' : ''}Bola ${players[turn].used + 1}/${BALLS} — segure LANÇAR / ESPAÇO e solte`);
  }

  function release() {
    if (!charging) return;
    charging = false;
    if (phase !== 'ready') return;
    if (launch(world, charge)) { phase = 'play'; saveLeft = saveUsed ? 0 : 5; setMsg(''); beep(200, 0.2, 'sawtooth', 0.06); }
    charge = 0;
  }

  function drained() {
    if (saveLeft > 0) {
      toast('Bola salva! ✨');
      saveUsed = true;
      const keep = world.score;
      resetBall(world);
      world.score = keep;
      phase = 'ready'; charge = 0; saveLeft = 0;
      setMsg('Bola salva — lance de novo');
      return;
    }
    const p = players[turn];
    p.score = world.score;
    p.used++;
    beep(130, 0.4, 'sawtooth', 0.06);
    if (!duo && p.score >= def.target) return finishSolo(true, p.used);
    const allDone = players.every((q) => q.used >= BALLS);
    if (allDone) return duo ? finishDuo() : finishSolo(false, p.used);
    phase = 'wait';
    const next = duo ? (turn + 1) % players.length : turn;
    setMsg(duo ? `Próximo: ${players[next].name}` : `Bola perdida — ${BALLS - p.used} restante(s)`);
    setTimeout(() => { if (destroyed) return; turn = next; startTurn(); }, 1300);
  }

  /** ballsUsed = bolas gastas contando a atual; 1ª bola = 3 estrelas, 3ª = 1 estrela. */
  function finishSolo(won, ballsUsed) {
    phase = 'over';
    const p = players[0];
    jingle(won ? [523, 659, 784, 1046] : [392, 330, 262]);
    onFinish({
      won, stars: won ? Math.max(1, 4 - ballsUsed) : 0,
      title: won ? 'Meta atingida! 🎉' : 'Fim de jogo',
      lines: [`Pontuação: ${fmt(p.score)}`, `Meta: ${fmt(def.target)}`],
    });
  }

  function finishDuo() {
    phase = 'over';
    const best = Math.max(...players.map((p) => p.score));
    const winners = players.filter((p) => p.score === best);
    jingle([523, 659, 784, 1046]);
    onFinish({
      won: true, stars: 0,
      title: winners.length > 1 ? 'Empate! 🤝' : `${winners[0].name} venceu! 🏆`,
      lines: players.map((p) => `${p.name}: ${fmt(p.score)} pontos`),
    });
  }

  /* ---------- Entrada ---------- */
  const KEYMAP = { KeyZ: 'left', ArrowLeft: 'left', ShiftLeft: 'left', KeyM: 'right', ArrowRight: 'right', ShiftRight: 'right', Slash: 'right' };
  const onKeyDown = (e) => {
    if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    else if (e.code === 'Space' || e.code === 'ArrowDown') { e.preventDefault(); if (phase === 'ready' && !e.repeat) charging = true; }
    else if (e.code === 'ArrowUp' || e.code === 'KeyN') { e.preventDefault(); doNudge(); }
  };
  const onKeyUp = (e) => {
    if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false;
    else if (e.code === 'Space' || e.code === 'ArrowDown') release();
  };
  function doNudge() {
    if (phase !== 'play' || nudges >= MAX_NUDGES) return;
    nudges++;
    nudge(world);
    if (nudges === MAX_NUDGES) toast('Cuidado: sem mais empurrões nesta bola', 1200);
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const bindZone = (el, side) => {
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); touches[side].add(e.pointerId); el.classList.add('on'); e.preventDefault(); });
    const up = (e) => { touches[side].delete(e.pointerId); if (!touches[side].size) el.classList.remove('on'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  bindZone(zoneL, 'left');
  bindZone(zoneR, 'right');
  plunger.addEventListener('pointerdown', (e) => { plunger.setPointerCapture(e.pointerId); if (phase === 'ready') charging = true; e.preventDefault(); });
  plunger.addEventListener('pointerup', release);
  plunger.addEventListener('pointercancel', release);
  nudgeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); doNudge(); });

  /* ---------- Laço principal ---------- */
  function frame(ts) {
    if (destroyed) return;
    const dt = Math.min(1 / 30, (ts - (last || ts)) / 1000);
    last = ts;

    world.flippers[0].pressed = keys.left || touches.left.size > 0;
    world.flippers[1].pressed = keys.right || touches.right.size > 0;
    if (charging) charge = Math.min(1, charge + dt / 0.9);

    if (phase === 'ready' || phase === 'play') {
      const res = step(world, dt);
      if (phase === 'play') {
        saveLeft = Math.max(0, saveLeft - dt);
        const b = world.ball;
        // lançamento fraco: a bola voltou e parou na raia
        if (inLane(b) && Math.hypot(b.vx, b.vy) < 25 && b.y > 650) {
          restTimer += dt;
          if (restTimer > 0.6) { phase = 'ready'; restTimer = 0; setMsg('Lançamento fraco — segure mais tempo'); }
        } else restTimer = 0;
        if (res === 'drained') drained();
        if (!duo && phase === 'play' && world.score >= def.target) { players[0].score = world.score; finishSolo(true, players[0].used + 1); }
      }
      handleEvents();
    }
    updateHud();
    draw();
    raf = requestAnimationFrame(frame);
  }

  let lastSfx = 0;
  function handleEvents() {
    const now = performance.now();
    for (const ev of world.events) {
      if (ev === 'bumper') beep(520 + Math.random() * 300, 0.07, 'square', 0.05);
      else if (ev === 'target') beep(900, 0.09, 'triangle', 0.05);
      else if (ev === 'sling') beep(300, 0.06, 'sawtooth', 0.04);
      else if (ev === 'bonus') { jingle([660, 880, 1100]); toast(`Bônus! Multiplicador x${world.mult}`, 1300); }
      else if ((ev === 'flipper' || ev === 'wall') && now - lastSfx > 60) { beep(ev === 'flipper' ? 240 : 150, 0.04, 'square', 0.03); lastSfx = now; }
    }
    world.events.length = 0;
  }

  let hudKey = '';
  function updateHud() {
    const p = players[turn];
    const score = phase === 'over' ? p.score : world.score;
    const key = `${turn}|${Math.round(score)}|${world.mult}|${p.used}|${phase}`;
    bar.style.width = `${charge * 100}%`;
    goalBar.style.width = `${Math.min(100, (score / def.target) * 100)}%`;
    if (key === hudKey) return;
    hudKey = key;
    whoEl.textContent = duo ? p.name : def.title;
    scoreEl.textContent = fmt(score);
    multEl.textContent = world.mult > 1 ? `x${world.mult}` : '';
    ballEl.textContent = duo ? players.map((q) => `${q.name}: ${fmt(q === p ? score : q.score)}`).join('  ·  ') : `Bola ${Math.min(p.used + 1, BALLS)}/${BALLS}`;
  }

  /* ---------- Desenho ---------- */
  const stars = Array.from({ length: 50 }, (_, i) => [(i * 97) % W, (i * 211) % H, (i % 3) + 0.5]);

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120a2e'); g.addColorStop(1, '#0a1530');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (const [x, y, r] of stars) ctx.fillRect(x, y, r, r);

    // paredes
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 8; ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (const w of world.walls) if (!w.kick) { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); }
    ctx.stroke();
    ctx.shadowColor = '#f0abfc'; ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 5;
    ctx.beginPath();
    for (const w of world.walls) if (w.kick) { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // mola do lançador
    const c = charge * 22;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const y = 692 + i * 1.6; ctx.moveTo(360, y); ctx.lineTo(384, y); } ctx.stroke();
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(361, 690 + c * 0.2, 22, 3);

    for (const t of world.targets) {
      ctx.fillStyle = t.hit ? '#334155' : `hsl(${48 + t.flash * 20},100%,${55 + t.flash * 25}%)`;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r + t.flash * 2, 0, 7); ctx.fill();
    }
    for (const b of world.bumpers) {
      const r = b.r + b.flash * 4;
      const rg = ctx.createRadialGradient(b.x - 5, b.y - 5, 2, b.x, b.y, r);
      rg.addColorStop(0, b.flash > 0.1 ? '#fff' : '#fde68a'); rg.addColorStop(1, b.flash > 0.1 ? '#fb7185' : '#f43f5e');
      ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 6 + b.flash * 14;
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, r - 5, 0, 7); ctx.stroke();
    }

    for (const f of world.flippers) {
      const tip = flipperTip(f);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    }

    const b = world.ball;
    const bg = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BALL_R);
    bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, 7); ctx.fill();
  }

  startTurn();
  raf = requestAnimationFrame(frame);
  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
