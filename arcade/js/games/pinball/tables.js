// Mesas do pinball (400×700). bumpers/targets = [x, y]. walls = [x1, y1, x2, y2] extras.
// `target` = pontos para vencer a fase no modo solo (3 bolas). No modo dupla, vence quem somar mais.
export const TABLES = [
  {
    title: 'Neon Iniciante', desc: '3 bumpers · meta 3.000', gravity: 900, target: 3000,
    bumpers: [[140, 230], [230, 200], [185, 310]],
    targets: [[45, 400], [45, 430], [320, 400], [320, 430]],
    walls: [],
  },
  {
    title: 'Cometa', desc: '5 bumpers · meta 8.000', gravity: 940, target: 8000,
    bumpers: [[110, 210], [250, 190], [185, 290], [85, 340], [285, 340]],
    targets: [[45, 400], [45, 430], [320, 400], [320, 430]],
    walls: [],
  },
  {
    title: 'Rolo Triplo', desc: 'Raias no topo · meta 14.000', gravity: 980, target: 14000,
    bumpers: [[100, 240], [270, 240], [185, 200], [185, 330], [90, 360], [280, 360]],
    targets: [[45, 420], [320, 420], [60, 450], [305, 450]],
    walls: [[130, 70, 130, 120], [185, 55, 185, 115], [240, 70, 240, 120]],
  },
  {
    title: 'Ciclone', desc: 'Mesa nervosa · meta 20.000', gravity: 1030, target: 20000,
    bumpers: [[90, 200], [185, 160], [280, 200], [135, 280], [235, 280], [185, 380], [70, 340], [300, 340]],
    targets: [[45, 430], [320, 430], [45, 460], [320, 460]],
    walls: [[140, 90, 140, 125], [230, 90, 230, 125], [60, 270, 100, 300], [310, 270, 270, 300]],
  },
  {
    title: 'Fliperama Final', desc: 'Gravidade alta · meta 28.000', gravity: 1090, target: 28000,
    bumpers: [[85, 190], [185, 140], [285, 190], [130, 260], [240, 260], [185, 340], [65, 330], [305, 330], [185, 230]],
    targets: [[45, 430], [320, 430], [45, 465], [320, 465], [185, 470]],
    walls: [[125, 80, 125, 120], [185, 60, 185, 100], [245, 80, 245, 120], [70, 280, 105, 310], [300, 280, 265, 310]],
  },
];
