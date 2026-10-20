// Catálogo dos jogos. `load()` importa o código pesado só quando o jogo é aberto.
import { SOLO_LEVELS, DUO_LEVELS } from './games/uno/config.js';
import { COURSES } from './games/golf/levels.js';
import { TABLES } from './games/pinball/tables.js';

const from = (list) => list.map((l) => ({ title: l.title, desc: l.desc }));

export const GAMES = [
  {
    id: 'pinball', title: 'Pinball', tagline: 'Flippers, bumpers e multiplicadores',
    howto: 'Segure ESPAÇO (ou o botão LANÇAR) e solte para lançar. Z / ← aciona o flipper esquerdo, M / → o direito; toque nas metades da tela no celular. ↑ dá um empurrão (máx. 3×).',
    levels: { solo: from(TABLES), duo: from(TABLES).map((l) => ({ ...l, desc: 'Alternando bolas · maior pontuação vence' })) },
    load: () => import('./games/pinball/index.js'),
  },
  {
    id: 'golf', title: 'Minigolfe', tagline: 'Menos tacadas vence',
    howto: 'Arraste para trás a partir de qualquer ponto (estilo estilingue) e solte para tacar. Quanto maior o arrasto, mais força. Areia freia, água custa +1 tacada. Máximo de 6 tacadas por buraco.',
    levels: { solo: from(COURSES), duo: from(COURSES).map((l) => ({ ...l, desc: 'Revezando tacadas · menos tacadas vence' })) },
    load: () => import('./games/golf/index.js'),
  },
  {
    id: 'uno', title: 'UNO', tagline: 'Clássico de cartas contra robôs ou amigo',
    howto: 'Jogue uma carta da mesma cor, número ou símbolo. Sem jogada? Compre uma. Com 2 cartas, aperte UNO! antes de jogar a penúltima, senão compra 2. Curinga +4 só se você não tiver a cor atual.',
    levels: { solo: from(SOLO_LEVELS), duo: from(DUO_LEVELS) },
    load: () => import('./games/uno/index.js'),
  },
];

export const byId = (id) => GAMES.find((g) => g.id === id);
