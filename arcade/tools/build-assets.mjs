// Gera todos os SVGs em assets/ a partir de código. Rode: node tools/build-assets.mjs
// Estilo: formas planas e geométricas, cantos arredondados, brilho suave num único ponto, paleta curta.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardSvg, backSvg, PALETTE } from '../js/games/uno/art.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const written = [];
function out(path, svg) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, svg.trim() + '\n');
  written.push(path);
}
const svg = (w, h, body, vb = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>`;

export const C = { bg: '#0e1024', bg2: '#171a3a', panel: '#1d2147', ink: '#eef0ff', indigo: '#7c5cff', cyan: '#22d3ee', pink: '#f472b6', rose: '#ff4d78', amber: '#fbbf24', mint: '#34d399', blue: '#3b82f6' };

/* ---------------- marca ---------------- */
const trio = (cx, cy, r, gap) => `
  <circle cx="${cx}" cy="${cy - gap}" r="${r}" fill="${C.pink}"/>
  <circle cx="${cx - gap * 0.95}" cy="${cy + gap * 0.62}" r="${r}" fill="${C.mint}" opacity=".95"/>
  <circle cx="${cx + gap * 0.95}" cy="${cy + gap * 0.62}" r="${r}" fill="${C.amber}" opacity=".95"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.34}" fill="#fff"/><circle cx="${cx - r * 0.1}" cy="${cy - r * 0.1}" r="${r * 0.1}" fill="#cfd6ee"/>`;
const tile = (rx) => `<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1b4d"/><stop offset="1" stop-color="${C.bg}"/></linearGradient></defs><rect width="512" height="512" rx="${rx}" fill="url(#t)"/>`;
out('brand/mark.svg', svg(512, 512, trio(256, 256, 100, 80)));
out('../icon.svg', svg(512, 512, tile(112) + trio(256, 256, 88, 66)));
out('../icon-maskable.svg', svg(512, 512, tile(0) + trio(256, 256, 84, 62)));

/* ---------------- ícones de interface (24×24, traço) ---------------- */
const ico = (id, body, fill = false) => `<symbol id="i-${id}" viewBox="0 0 24 24" ${fill ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${body}</symbol>`;
const STAR = 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z';
out('icons.svg', `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${ico('back', '<path d="M15 5l-7 7 7 7"/>')}
${ico('restart', '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>')}
${ico('sound-on', '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>')}
${ico('sound-off', '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5l4.5 5M21.5 9.5l-4.5 5"/>')}
${ico('star', `<path d="${STAR}"/>`, true)}
${ico('star-o', `<path d="${STAR}"/>`)}
${ico('lock', '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>')}
${ico('user', '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>')}
${ico('users', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M17.5 14.2a5.5 5.5 0 0 1 4 5.3"/>')}
${ico('trophy', '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4"/><path d="M12 13v4M8.5 20h7M10 17h4"/>')}
${ico('chevron-right', '<path d="M9 5l7 7-7 7"/>')}
${ico('up', '<path d="M5 15l7-7 7 7"/>')}
${ico('play', '<path d="M8 5l11 7-11 7z"/>')}
${ico('rotate', '<rect x="7" y="3" width="10" height="16" rx="2.5"/><path d="M3 21h18M18 19l3 2-3 2" transform="translate(0 -2)"/>')}
</svg>`);

/* ---------------- capas dos jogos (160×160) ---------------- */
const rr = (fillDefs, body) => svg(160, 160, `<defs>${fillDefs}<clipPath id="c"><rect width="160" height="160" rx="36"/></clipPath></defs><g clip-path="url(#c)">${body}</g>`);

out('covers/pinball.svg', rr(
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a78"/><stop offset="1" stop-color="#0d1030"/></linearGradient>
   <radialGradient id="b" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8a93b2"/></radialGradient>`,
  `<rect width="160" height="160" fill="url(#g)"/>
   <path d="M22 160V78a58 58 0 0 1 116 0v82" fill="none" stroke="${C.cyan}" stroke-width="5" stroke-linecap="round" opacity=".9"/>
   <circle cx="62" cy="62" r="17" fill="${C.rose}"/><circle cx="62" cy="62" r="9" fill="#ffe3ea"/>
   <circle cx="104" cy="50" r="12" fill="${C.pink}"/><circle cx="104" cy="50" r="6" fill="#ffe3ea"/>
   <circle cx="108" cy="96" r="9" fill="${C.amber}"/>
   <path d="M30 128l38 14" stroke="${C.cyan}" stroke-width="13" stroke-linecap="round"/><path d="M130 128l-38 14" stroke="${C.cyan}" stroke-width="13" stroke-linecap="round"/>
   <circle cx="80" cy="104" r="10" fill="url(#b)"/>`));

out('covers/golf.svg', rr(
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#145c37"/><stop offset="1" stop-color="#0a3622"/></linearGradient>
   <radialGradient id="b" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd6e6"/></radialGradient>`,
  `<rect width="160" height="160" fill="url(#g)"/>
   <ellipse cx="80" cy="118" rx="62" ry="30" fill="#2fbf71"/><ellipse cx="80" cy="118" rx="62" ry="30" fill="none" stroke="#1d8f52" stroke-width="3"/>
   <path d="M122 124a30 18 0 0 1-30 14" fill="none" stroke="${C.amber}" stroke-width="7" stroke-linecap="round" opacity=".9"/>
   <ellipse cx="94" cy="112" rx="13" ry="6.5" fill="#0b1a12"/>
   <path d="M94 110V44" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M94 44l32 12-32 12z" fill="${C.rose}"/>
   <circle cx="52" cy="124" r="8" fill="url(#b)"/><ellipse cx="55" cy="131" rx="9" ry="3" fill="#0003"/>`));

const miniCard = (c, x, y, rot, glyph = '') => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-26" y="-38" width="52" height="76" rx="9" fill="#fff"/><rect x="-22" y="-34" width="44" height="68" rx="6" fill="${c}"/><ellipse rx="15" ry="26" transform="rotate(24)" fill="#fff"/>${glyph}</g>`;
out('covers/uno.svg', rr(
  `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a1030"/><stop offset="1" stop-color="#1b0d26"/></linearGradient>`,
  `<rect width="160" height="160" fill="url(#g)"/>
   ${miniCard(PALETTE.blue.main, 50, 88, -22)}${miniCard(PALETTE.yellow.main, 110, 88, 22)}
   ${miniCard(PALETTE.red.main, 80, 80, 0, `<path d="M-6 -10V4a6 6 0 0 0 12 0V-10" transform="rotate(-24)" fill="none" stroke="${PALETTE.red.dark}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`)}`));

/* ---------------- Pinball ---------------- */
out('pinball/ball.svg', svg(36, 36,
  `<defs><radialGradient id="r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#c3cadb"/><stop offset="1" stop-color="#5d6685"/></radialGradient></defs>
   <circle cx="18" cy="18" r="18" fill="url(#r)"/><ellipse cx="12" cy="11" rx="5.5" ry="3.2" fill="#fff" opacity=".85" transform="rotate(-30 12 11)"/>`));

const bumper = (hit) => svg(76, 76,
  `<defs><radialGradient id="r" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="${hit ? '#fffbe0' : '#ffb3c6'}"/><stop offset=".55" stop-color="${hit ? '#ffd166' : C.rose}"/><stop offset="1" stop-color="${hit ? '#ff9f1c' : '#b8113f'}"/></radialGradient></defs>
   <circle cx="38" cy="38" r="37" fill="url(#r)"/><circle cx="38" cy="38" r="27" fill="none" stroke="#fff" stroke-width="4" opacity="${hit ? 1 : '.85'}"/>
   <circle cx="38" cy="38" r="15" fill="${hit ? '#fff' : '#fff0f4'}"/>
   <path d="M38 28l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="${hit ? '#ff9f1c' : C.rose}"/>`);
out('pinball/bumper.svg', bumper(false));
out('pinball/bumper-hit.svg', bumper(true));

out('pinball/target.svg', svg(32, 32,
  `<defs><radialGradient id="r" cx=".38" cy=".32"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="${C.amber}"/></radialGradient></defs>
   <circle cx="16" cy="16" r="15" fill="url(#r)"/><circle cx="16" cy="16" r="9" fill="none" stroke="#b45309" stroke-width="2.5" opacity=".55"/><circle cx="16" cy="16" r="3.5" fill="#b45309" opacity=".7"/>`));
out('pinball/target-off.svg', svg(32, 32,
  `<circle cx="16" cy="16" r="15" fill="#2a3158"/><circle cx="16" cy="16" r="9" fill="none" stroke="#3d4678" stroke-width="2.5"/><circle cx="16" cy="16" r="3.5" fill="#3d4678"/>`));

// Flipper desenhado apontando para +x com o pivô em (16,16): 100×32 px de mesa.
out('pinball/flipper.svg', svg(200, 64,
  `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs>
   <path d="M16 8L82 11A5 5 0 0 1 82 21L16 24A8 8 0 0 1 16 8Z" fill="url(#f)"/>
   <path d="M20 12.5L79 14" stroke="#e0f2fe" stroke-width="3" stroke-linecap="round"/>
   <circle cx="16" cy="16" r="4" fill="#0c4a6e"/><circle cx="16" cy="16" r="1.6" fill="#bae6fd"/>`, '0 0 100 32'));

out('pinball/plunger-knob.svg', svg(56, 20,
  `<rect x="1" y="1" width="54" height="18" rx="9" fill="${C.amber}"/><rect x="6" y="4" width="44" height="4" rx="2" fill="#fff" opacity=".55"/>`));

const dots = Array.from({ length: 16 }, (_, i) => `<circle cx="${20 + ((i * 97) % 360)}" cy="${40 + ((i * 211) % 620)}" r="${1 + (i % 3) * 0.6}" fill="#fff" opacity=".25"/>`).join('');
const chev = (x, y, c, o) => `<path d="M${x - 8} ${y + 4}l8-8 8 8" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
out('pinball/table-bg.svg', svg(800, 1400,
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1257"/><stop offset=".55" stop-color="#0d1236"/><stop offset="1" stop-color="#070b24"/></linearGradient>
   <pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r=".9" fill="#fff" opacity=".07"/></pattern></defs>
   <rect width="400" height="700" fill="url(#g)"/><rect width="400" height="700" fill="url(#p)"/>
   <g fill="none" stroke="${C.indigo}" opacity=".28" stroke-width="2"><circle cx="200" cy="190" r="150"/><circle cx="200" cy="190" r="104"/><circle cx="200" cy="190" r="58"/></g>
   <circle cx="200" cy="190" r="14" fill="${C.indigo}" opacity=".25"/>
   <g transform="translate(182 505)" fill="none" stroke-width="2.5" opacity=".4"><circle cx="0" cy="-20" r="22" stroke="${C.pink}"/><circle cx="-21" cy="14" r="22" stroke="${C.mint}"/><circle cx="21" cy="14" r="22" stroke="${C.amber}"/></g>
   <rect x="357" y="300" width="31" height="390" rx="8" fill="#000" opacity=".28"/>
   ${chev(372, 640, C.cyan, .45)}${chev(372, 600, C.cyan, .3)}${chev(372, 560, C.cyan, .2)}
   ${chev(52, 548, C.pink, .35)}${chev(312, 548, C.pink, .35)}
   ${dots}`, '0 0 400 700'));

/* ---------------- Minigolfe ---------------- */
const golfBall = (id, a, b) => svg(28, 28,
  `<defs><radialGradient id="${id}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
   <circle cx="14" cy="14" r="13" fill="url(#${id})"/>
   <g fill="${a}" opacity=".35"><circle cx="10" cy="16" r="1.4"/><circle cx="15" cy="19" r="1.4"/><circle cx="18" cy="14" r="1.4"/><circle cx="13" cy="12" r="1.2"/></g>
   <ellipse cx="10" cy="8" rx="3.2" ry="1.8" fill="#fff" opacity=".9" transform="rotate(-30 10 8)"/>`);
out('golf/ball.svg', golfBall('a', '#7b8499', '#cdd5e6'));
out('golf/ball-amber.svg', golfBall('b', '#a86a00', '#f59e0b'));

out('golf/hole.svg', svg(48, 48,
  `<defs><radialGradient id="h" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#1a2a1f"/></radialGradient></defs>
   <circle cx="24" cy="24" r="23" fill="#1d8f52" opacity=".55"/><circle cx="24" cy="24" r="12.5" fill="url(#h)"/><path d="M13 22a11.5 11.5 0 0 1 22 0" fill="none" stroke="#000" stroke-width="2" opacity=".5"/>`));
out('golf/flag.svg', svg(44, 60,
  `<ellipse cx="8" cy="57" rx="6" ry="2.2" fill="#000" opacity=".3"/>
   <rect x="6.5" y="4" width="3" height="53" rx="1.5" fill="#f1f5f9"/><circle cx="8" cy="4" r="3" fill="${C.amber}"/>
   <path d="M9.5 6L40 15 9.5 24z" fill="${C.rose}"/><path d="M9.5 6L40 15 9.5 15z" fill="#fff" opacity=".18"/>`));
out('golf/tee.svg', svg(36, 36,
  `<circle cx="18" cy="18" r="16" fill="#fff" opacity=".16"/><circle cx="18" cy="18" r="16" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" opacity=".6"/>`));

// Texturas repetíveis (usadas como pattern no canvas)
out('golf/grass.svg', svg(80, 80,
  `<rect width="40" height="80" fill="#34a04e"/><rect x="40" width="40" height="80" fill="#2f8f46"/>
   <g stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".14" fill="none"><path d="M9 20l2-5 2 5M26 58l2-5 2 5M52 32l2-5 2 5M66 66l2-5 2 5M18 70l2-5 2 5M70 12l2-5 2 5"/></g>`));
const specks = Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 29 + 7) % 64}" cy="${(i * 47 + 11) % 64}" r="${i % 3 ? 1.1 : 1.8}" fill="${i % 2 ? '#c9a85a' : '#fff6d6'}" opacity=".65"/>`).join('');
out('golf/sand.svg', svg(64, 64, `<rect width="64" height="64" fill="#ecd699"/>${specks}`));
out('golf/water.svg', svg(64, 32,
  `<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b8cf0"/><stop offset="1" stop-color="#2269cf"/></linearGradient></defs>
   <rect width="64" height="32" fill="url(#w)"/>
   <path d="M0 9q8-7 16 0t16 0t16 0t16 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".4"/>
   <path d="M-8 25q8-7 16 0t16 0t16 0t16 0t16 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".22"/>`));
out('golf/wood.svg', svg(48, 24,
  `<rect width="48" height="24" fill="#8f5d2d"/>
   <g fill="none" stroke="#6f4620" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M0 6q12-3 24 0t24 0"/><path d="M0 14q12 3 24 0t24 0"/><path d="M0 21q12-2 24 0t24 0"/></g>`));
out('golf/hazard.svg', svg(24, 24,
  `<rect width="24" height="24" fill="#e76f51"/><path d="M12 0H24L0 24V12zM24 12V24H12z" fill="#ffb4a2" opacity=".8"/>`));

/* ---------------- UNO (referência: o jogo usa o mesmo código inline) ---------------- */
for (const color of Object.keys(PALETTE)) {
  for (let v = 0; v <= 9; v++) out(`uno/${color}-${v}.svg`, cardSvg({ kind: 'number', color, value: v }, { standalone: true }));
  for (const kind of ['skip', 'reverse', 'draw2']) out(`uno/${color}-${kind}.svg`, cardSvg({ kind, color }, { standalone: true }));
}
out('uno/wild.svg', cardSvg({ kind: 'wild' }, { standalone: true }));
out('uno/wild4.svg', cardSvg({ kind: 'wild4' }, { standalone: true }));
out('uno/back.svg', backSvg({ standalone: true }));

/* ---------------- lista para o service worker ---------------- */
const runtime = written.filter((p) => !p.startsWith('uno/'));
writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(runtime.map((p) => (p.startsWith('../') ? p.slice(3) : `assets/${p}`)), null, 1) + '\n');
console.log(`${written.length} arquivos SVG gerados (${runtime.length} usados em tempo de execução).`);
