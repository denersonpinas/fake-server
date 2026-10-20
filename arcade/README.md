# Arcade Trio

Web app (PWA) que reúne **Pinball**, **Minigolfe** e **UNO**, cada um com fases, modo **solo** e modo **dupla**.
Sem build e sem dependências: HTML + CSS + JavaScript (ES modules). Instala no celular e funciona offline.

## Rodar e testar

```bash
cd arcade
npm start            # http://localhost:8080  (python3 -m http.server)
npm test             # 39 testes de lógica (node --test), sem navegador
```

## Instalar no celular

1. Publique a pasta `arcade/` como site estático (ex.: Vercel com *Root Directory* = `arcade`, GitHub Pages, Netlify).
   O restante do repositório (`server.js`, `db.json`) é a API fake e não é afetado.
2. Abra o link no celular. **Android/Chrome**: menu ⋮ → *Instalar app*. **iPhone/Safari**: Compartilhar → *Adicionar à Tela de Início*.
3. **Offline**: no primeiro acesso o service worker (`sw.js`) baixa o app inteiro (51 arquivos, poucos KB cada). O rodapé do hub mostra
   *Preparando… → Pronto para jogar offline*; depois disso tudo funciona sem internet (progresso e preferências ficam no aparelho).
   O hub avisa quando a conexão cai/volta e quando há **nova versão** (botão *Atualizar*); em navegadores que permitem, aparece *Instalar app*.
   Ao mudar qualquer arquivo, incremente `CACHE` em `sw.js` para os aparelhos receberem a atualização.
   Atenção: `cache.addAll` falha se a lista tiver URLs duplicadas — `sw.js` já deduplica.

## Assets (arte)

Linguagem visual: formas planas e geométricas, cantos arredondados, um brilho suave por objeto e paleta curta
(índigo, ciano, rosa, rubi, âmbar, menta) sobre azul-noite. Tudo é **SVG** (leve, nítido em qualquer tela, offline).
Veja `assets/index.html` (guia de estilo ao vivo) ou `assets/preview.png`.

```
assets/brand/      marca (3 círculos + bola)        assets/covers/   capas dos 3 jogos
assets/icons.svg   sprite de ícones de interface    assets/pinball/  bola, bumper, alvo, flipper, lançador, fundo da mesa
assets/golf/       bola J1/J2, buraco, bandeira, tee + texturas repetíveis (grama, areia, água, madeira, obstáculo móvel)
assets/uno/        55 cartas (referência; o jogo desenha as mesmas cartas inline via js/games/uno/art.js)
icon*.svg/png      ícone do app (normal e maskable)
```

Os SVGs são **gerados por código**: edite `tools/build-assets.mjs` (ou `js/games/uno/art.js`) e rode
`node tools/build-assets.mjs`. Isso também atualiza `assets/manifest.json`, usado pelo service worker para o cache offline.
Os PNGs do ícone são renderizações de `icon.svg` / `icon-maskable.svg`.

## Arquitetura

```
index.html · manifest.webmanifest · sw.js · icon*.{svg,png}
css/style.css
js/main.js        roteador por hash (#/, #/g/<jogo>, #/p/<jogo>/<modo>/<fase>), modal de resultado
js/registry.js    catálogo: título, como jogar, lista de fases por modo, load() dinâmico
js/store.js       estrelas por jogo/modo/fase + preferências (localStorage)
js/ui.js          h() (criar DOM), toast, modal
js/sfx.js         efeitos sonoros sintetizados (WebAudio)
js/games/<jogo>/  physics.js|logic.js (puro, testável) · config/levels/tables · index.js (UI)
tests/            testes de lógica
```

**Contrato de cada jogo** — `mount(container, { mode, level, names, onFinish }) → { destroy() }`.
O jogo chama `onFinish({ won, stars, title, lines })` e o hub salva as estrelas e mostra *Próxima fase / Repetir / Fases*.
Para adicionar um jogo: crie a pasta, exporte `mount`, registre em `registry.js`.

**Progresso**: solo libera fase a fase (≥1 estrela na anterior); dupla tem todas as fases abertas.

## Regras e lógica por jogo

### UNO (`games/uno`)
- Baralho oficial de 108 cartas; 7 por jogador; vira a 1ª carta (um +4 não pode abrir e é recolocado).
- Joga carta de mesma **cor, número ou símbolo**. Curinga troca a cor. **+4 só se a mão não tiver a cor atual.**
- Pular, inverter (com 2 jogadores vira "pular"), +2 e +4 (vítima compra e perde a vez).
- Sem jogada: compra 1; se der para jogar, pode jogar ou passar.
- **UNO**: com 2 cartas, aperte *UNO!* antes de jogar a penúltima, senão compra 2.
- Fim da rodada: vencedor soma as cartas das mãos adversárias (número = valor, ação = 20, curinga = 50).
- Monte vazio: reembaralha o descarte mantendo a carta do topo.
- **Solo** (6 fases): 1–3 robôs, de *aleatório* a *estratégico* (prioriza descartar cartas pesadas, guarda curinga, pressiona quem está com poucas cartas). Vitórias de rodada necessárias crescem por fase. Estrelas: 3 sem perder rodada, 2 perdendo uma, 1 nas demais.
- **Dupla** (4 fases): dois humanos no mesmo aparelho, com tela de "passe o aparelho" para esconder a mão. Rodada única, melhor de 3, melhor de 5 ou primeiro a 500 pontos.
- Simplificação consciente: não há desafio de +4 nem "pegar" quem esqueceu o UNO.

### Minigolfe (`games/golf`)
- Campo 800×480, bola circular com atrito exponencial (grama) e maior na **areia**; obstáculos retangulares com quique; obstáculos **móveis** (oscilam por seno) transferem velocidade à bola; **água** = +1 tacada e a bola volta ao ponto da tacada anterior.
- Tacada: arraste para trás (estilingue) e solte; força proporcional ao arrasto. Bola rápida passa por cima do buraco, lenta cai (com leve atração).
- **Máximo de 6 tacadas por buraco**. Cada fase é um campo de 3 buracos (4 campos). Estrelas: 3 se total ≤ par, 2 se ≤ par+3, 1 senão.
- **Dupla**: cada um com sua bola; joga **quem está mais longe do buraco**; quem foi melhor no buraco anterior tem a honra de abrir o próximo. Menos tacadas no total vence.
- Física em passo fixo de 1/120 s. O teste `golf.test.mjs` prova por busca em largura que **todo buraco tem solução** em até par+2 tacadas.

### Pinball (`games/pinball`)
- Mesa 400×700 com lançador (segure e solte: a força define a velocidade), 2 flippers (cápsulas giratórias que transferem velocidade angular à bola), 2 estilingues, bumpers e alvos; 10 subpassos por frame contra tunelamento.
- Pontos: bumper 100, alvo 500, estilingue 10. Derrubar **todos os alvos** dá bônus de 1000 e sobe o multiplicador (até x5). *Bola salva* nos primeiros 5 s e até 3 empurrões por bola.
- **Solo**: 3 bolas para atingir a **meta** da mesa (3.000 → 28.000 em 5 mesas). Estrelas: meta na 1ª bola = 3, 2ª = 2, 3ª = 1.
- **Dupla**: cada um tem 3 bolas, alternadas; maior pontuação vence.
- Controles: Espaço (lançar), Z/← e M/→ (flippers), ↑ (empurrar); no celular, toque nas metades da tela e use os botões LANÇAR e ⤒.
