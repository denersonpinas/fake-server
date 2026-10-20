// Cada fase é um campo com 3 buracos. Campo: 800×480, área jogável (20,20)–(780,460).
// blocks = obstáculos sólidos · sand = areia (freia) · water = lago (+1 tacada e volta ao ponto anterior)
// movers = obstáculos móveis {x,y,w,h, ax/ay = amplitude, speed = rad/s, phase}

export const COURSES = [
  {
    title: 'Campo Verde',
    desc: 'Retas e curvas para aquecer',
    holes: [
      { name: 'Reta', par: 2, tee: { x: 90, y: 240 }, hole: { x: 700, y: 240 }, blocks: [] },
      {
        name: 'Zigue-zague', par: 3, tee: { x: 90, y: 400 }, hole: { x: 710, y: 100 },
        blocks: [{ x: 380, y: 20, w: 24, h: 300 }, { x: 560, y: 180, w: 24, h: 280 }],
      },
      {
        name: 'Pilares', par: 3, tee: { x: 90, y: 240 }, hole: { x: 710, y: 240 },
        blocks: [{ x: 380, y: 200, w: 40, h: 80 }, { x: 540, y: 100, w: 30, h: 30 }, { x: 540, y: 350, w: 30, h: 30 }, { x: 250, y: 120, w: 30, h: 30 }, { x: 250, y: 330, w: 30, h: 30 }],
      },
    ],
  },
  {
    title: 'Deserto & Lago',
    desc: 'Areia que freia e água que castiga',
    holes: [
      {
        name: 'Duna', par: 3, tee: { x: 90, y: 240 }, hole: { x: 710, y: 240 },
        blocks: [{ x: 330, y: 20, w: 140, h: 60 }, { x: 330, y: 400, w: 140, h: 60 }],
        sand: [{ x: 330, y: 80, w: 140, h: 320 }],
      },
      {
        name: 'Ponte', par: 3, tee: { x: 90, y: 240 }, hole: { x: 710, y: 240 },
        water: [{ x: 330, y: 20, w: 140, h: 290 }],
        blocks: [{ x: 560, y: 20, w: 24, h: 170 }],
      },
      {
        name: 'Oásis', par: 4, tee: { x: 80, y: 410 }, hole: { x: 720, y: 80 },
        blocks: [{ x: 300, y: 20, w: 24, h: 250 }],
        water: [{ x: 420, y: 330, w: 220, h: 130 }],
        sand: [{ x: 560, y: 90, w: 140, h: 110 }, { x: 330, y: 270, w: 80, h: 60 }],
      },
    ],
  },
  {
    title: 'Fábrica Maluca',
    desc: 'Obstáculos que se mexem',
    holes: [
      {
        name: 'Portão', par: 3, tee: { x: 90, y: 240 }, hole: { x: 710, y: 240 },
        blocks: [{ x: 390, y: 20, w: 24, h: 120 }, { x: 390, y: 340, w: 24, h: 120 }],
        movers: [{ x: 390, y: 200, w: 24, h: 70, ay: 80, speed: 1.6 }],
      },
      {
        name: 'Esteira', par: 3, tee: { x: 90, y: 400 }, hole: { x: 710, y: 80 },
        blocks: [{ x: 250, y: 20, w: 24, h: 330 }, { x: 520, y: 130, w: 24, h: 330 }],
        movers: [{ x: 330, y: 200, w: 100, h: 20, ax: 60, speed: 1.4 }, { x: 600, y: 300, w: 100, h: 20, ax: 60, speed: 1.9, phase: 1.5 }],
      },
      {
        name: 'Prensa', par: 4, tee: { x: 80, y: 240 }, hole: { x: 720, y: 240 },
        blocks: [{ x: 250, y: 20, w: 20, h: 150 }, { x: 250, y: 310, w: 20, h: 150 }, { x: 520, y: 20, w: 20, h: 150 }, { x: 520, y: 310, w: 20, h: 150 }],
        movers: [{ x: 250, y: 180, w: 20, h: 120, ay: 60, speed: 1.3 }, { x: 520, y: 180, w: 20, h: 120, ay: 60, speed: 1.3, phase: Math.PI }],
        sand: [{ x: 280, y: 190, w: 230, h: 100 }],
      },
    ],
  },
  {
    title: 'Torneio Final',
    desc: 'Tudo junto, par apertado',
    holes: [
      {
        name: 'Labirinto', par: 4, tee: { x: 80, y: 420 }, hole: { x: 720, y: 60 },
        blocks: [{ x: 160, y: 120, w: 24, h: 340 }, { x: 300, y: 20, w: 24, h: 340 }, { x: 440, y: 120, w: 24, h: 340 }, { x: 580, y: 20, w: 24, h: 300 }],
      },
      {
        name: 'Ilha', par: 4, tee: { x: 80, y: 240 }, hole: { x: 700, y: 240 },
        water: [{ x: 260, y: 20, w: 120, h: 220 }, { x: 420, y: 250, w: 120, h: 210 }],
        sand: [{ x: 600, y: 170, w: 130, h: 140 }],
      },
      {
        name: 'Gran Finale', par: 5, tee: { x: 70, y: 420 }, hole: { x: 730, y: 70 },
        blocks: [{ x: 200, y: 20, w: 24, h: 300 }, { x: 420, y: 160, w: 24, h: 300 }],
        water: [{ x: 230, y: 380, w: 180, h: 80 }, { x: 460, y: 20, w: 150, h: 100 }],
        sand: [{ x: 460, y: 200, w: 200, h: 120 }],
        movers: [{ x: 300, y: 120, w: 90, h: 20, ax: 70, speed: 1.7 }, { x: 640, y: 330, w: 20, h: 90, ay: 50, speed: 1.5 }],
      },
    ],
  },
];
