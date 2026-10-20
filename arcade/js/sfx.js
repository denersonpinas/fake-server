// Efeitos sonoros sintetizados (sem arquivos de áudio).
let ctx = null;
let muted = false;
export const setMuted = (m) => { muted = m; };

export function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.04) {
  if (muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch { /* áudio indisponível */ }
}

export const jingle = (notes) => notes.forEach((f, i) => setTimeout(() => beep(f, 0.14, 'triangle', 0.05), i * 120));
