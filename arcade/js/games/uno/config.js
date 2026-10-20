// Fases do UNO. `win.n` = vitórias de rodada (rounds) ou pontos (points) necessários para ganhar a partida.
export const BOT_NAMES = ['Robô Bia', 'Robô Leo', 'Robô Zeca'];

export const SOLO_LEVELS = [
  { title: 'Aquecimento', desc: '1 robô fácil · 1 rodada', bots: [1], win: { type: 'rounds', n: 1 } },
  { title: 'Duelo', desc: '1 robô médio · melhor de 3', bots: [2], win: { type: 'rounds', n: 2 } },
  { title: 'Trio', desc: '2 robôs · 1 rodada', bots: [1, 2], win: { type: 'rounds', n: 1 } },
  { title: 'Mesa cheia', desc: '2 robôs médios · melhor de 3', bots: [2, 2], win: { type: 'rounds', n: 2 } },
  { title: 'Quarteto', desc: '3 robôs · melhor de 3', bots: [2, 3, 2], win: { type: 'rounds', n: 2 } },
  { title: 'Mestre UNO', desc: '3 robôs difíceis · 3 vitórias', bots: [3, 3, 3], win: { type: 'rounds', n: 3 } },
];

export const DUO_LEVELS = [
  { title: 'Rodada única', desc: 'Uma vitória decide', win: { type: 'rounds', n: 1 } },
  { title: 'Melhor de 3', desc: 'Primeiro a 2 vitórias', win: { type: 'rounds', n: 2 } },
  { title: 'Melhor de 5', desc: 'Primeiro a 3 vitórias', win: { type: 'rounds', n: 3 } },
  { title: 'Clássico 500', desc: 'Primeiro a 500 pontos', win: { type: 'points', n: 500 } },
];
