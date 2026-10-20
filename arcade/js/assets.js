// Carrega as imagens SVG de assets/ (relativo a este arquivo) e devolve { chave: HTMLImageElement }.
const BASE = new URL('../assets/', import.meta.url);

export function loadImages(map) {
  return Promise.all(Object.entries(map).map(([key, src]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    img.src = new URL(src, BASE).href;
  }))).then(Object.fromEntries);
}

/** Textura repetível nítida em telas 2×: rasteriza a imagem em escala 2 e reduz o padrão pela metade. */
export function makePattern(ctx, img, w = img.width, h = img.height) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const pattern = ctx.createPattern(c, 'repeat');
  pattern.setTransform(new DOMMatrix().scale(0.5));
  return pattern;
}
