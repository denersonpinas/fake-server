// Arte das cartas do UNO em SVG (viewBox 120×180). Usada inline no jogo e exportada em arquivos por tools/build-assets.mjs.
export const PALETTE = {
  red: { main: '#ef4155', dark: '#c81e3a' },
  yellow: { main: '#f7b928', dark: '#cf8700' },
  green: { main: '#2fbf71', dark: '#168a4d' },
  blue: { main: '#3b82f6', dark: '#1d56c9' },
};
const INK = '#15162e';
const FONT = `font-family="Poppins,'Segoe UI',system-ui,-apple-system,sans-serif" font-weight="900"`;
const WILD_COLORS = ['red', 'yellow', 'green', 'blue'];

const ellipse = (fill, extra = '') => `<ellipse cx="60" cy="90" rx="38" ry="64" transform="rotate(24 60 90)" fill="${fill}" ${extra}/>`;

/** Símbolo central (centrado em 60,90) de cada tipo de carta. */
function glyph(kind, value, color) {
  switch (kind) {
    case 'number':
      return `<text x="60" y="116" text-anchor="middle" font-size="78" ${FONT} fill="${color}">${value}</text>` +
        (value === 6 || value === 9 ? `<rect x="46" y="122" width="28" height="5" rx="2.5" fill="${color}"/>` : '');
    case 'skip':
      return `<g fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"><circle cx="60" cy="90" r="25"/><path d="M42 108L78 72"/></g>`;
    case 'reverse': {
      const arrow = '<path d="M34 68H62V58L86 76L62 94V84H34Z"/>';
      return `<g fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round">${arrow}<g transform="rotate(180 60 90)">${arrow}</g></g>`;
    }
    case 'draw2':
      return `<g><rect x="34" y="62" width="32" height="46" rx="6" fill="${color}" opacity=".55" transform="rotate(-12 50 85)"/><rect x="54" y="70" width="32" height="46" rx="6" fill="${color}" stroke="#fff" stroke-width="4" transform="rotate(10 70 93)"/></g>`;
    default:
      return '';
  }
}

/** Mesmo símbolo, miniaturizado para os cantos. */
const corner = (kind, value, cx, cy, fill) => {
  if (kind === 'number') return `<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="22" ${FONT} fill="${fill}">${value}</text>`;
  if (kind === 'draw2') return `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="17" ${FONT} fill="${fill}">+2</text>`;
  if (kind === 'wild4') return `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="17" ${FONT} fill="${fill}">+4</text>`;
  if (kind === 'wild') return WILD_COLORS.map((c, i) => `<rect x="${cx - 8 + (i % 2) * 9}" y="${cy - 8 + Math.floor(i / 2) * 9}" width="7" height="7" rx="2" fill="${PALETTE[c].main}"/>`).join('');
  return `<g transform="translate(${cx} ${cy}) scale(.3) translate(-60 -90)" fill="${fill}">${glyph(kind, value, '#fff')}</g>`;
};

function frame(bg, inner, cornerFn) {
  return `<rect x="2" y="2" width="116" height="176" rx="14" fill="#fff"/><rect x="7" y="7" width="106" height="166" rx="10" fill="${bg}"/>${inner}${cornerFn('#fff')}<g transform="rotate(180 60 90)">${cornerFn('#fff')}</g>`;
}

const wrap = (body, standalone) => `<svg ${standalone ? 'xmlns="http://www.w3.org/2000/svg" width="120" height="180" ' : ''}viewBox="0 0 120 180" aria-hidden="true">${body}</svg>`;

/** card = { kind: 'number'|'skip'|'reverse'|'draw2'|'wild'|'wild4', color, value } */
export function cardSvg(card, { standalone = false } = {}) {
  if (card.kind === 'wild' || card.kind === 'wild4') {
    const quads = [['red', 0, 0], ['yellow', 60, 0], ['blue', 0, 90], ['green', 60, 90]]
      .map(([c, x, y]) => `<rect x="${x}" y="${y}" width="60" height="90" fill="${PALETTE[c].main}"/>`).join('');
    const inner = `<defs><clipPath id="uw"><ellipse cx="60" cy="90" rx="38" ry="64" transform="rotate(24 60 90)"/></clipPath></defs>` +
      `${ellipse('#fff')}<g clip-path="url(#uw)" transform="translate(60 90) scale(.94) translate(-60 -90)">${quads}<path d="M60 0V180M0 90H120" stroke="#fff" stroke-width="4"/></g>` +
      (card.kind === 'wild4' ? `<circle cx="60" cy="90" r="23" fill="#fff"/><text x="60" y="99" text-anchor="middle" font-size="26" ${FONT} fill="${INK}">+4</text>` : '');
    return wrap(frame(INK, inner, (fill) => corner(card.kind, null, 20, 26, fill)), standalone);
  }
  const p = PALETTE[card.color];
  const inner = ellipse('#fff') + glyph(card.kind, card.value, p.dark);
  return wrap(frame(p.main, inner, (fill) => corner(card.kind, card.value, 20, 26, fill)), standalone);
}

/** Verso da carta: fundo escuro, elipse vermelho→âmbar e um "U" desenhado (sem depender de fonte). */
export function backSvg({ standalone = false } = {}) {
  const body = `<defs><linearGradient id="ub" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d6d"/><stop offset="1" stop-color="#ffb02e"/></linearGradient></defs>` +
    `<rect x="2" y="2" width="116" height="176" rx="14" fill="#fff"/><rect x="7" y="7" width="106" height="166" rx="10" fill="${INK}"/>` +
    `${ellipse('url(#ub)')}<path d="M44 68V104a16 16 0 0 0 32 0V68" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="22" cy="24" r="4" fill="#ffb02e"/><circle cx="98" cy="156" r="4" fill="#ff4d6d"/>`;
  return wrap(body, standalone);
}
