// Собирает PIECE_SVG_XML из Spatial-фигур (src/assets/pieces/*.svg, lichess.org, тема spatial).
// - делает id градиентов уникальными на фигуру (как и в Celtic/Fantasy: одинаковые
//   id вроде "main-gradient" встречаются у нескольких фигур и коллизируют в общем DOM)
// - разворачивает style="..." на элементах в обычные атрибуты (fill, stroke-width,
//   stop-color, stop-opacity) — SvgXml не всегда учитывает их через style
// - разворачивает CSS-классы из <style> в атрибуты (SvgXml не поддерживает <style>)
// Запуск: node scripts/generate-spatial-pieces.js
const fs = require('fs');
const path = require('path');
const { inlineSvgStyles } = require('./lib/inlineSvgStyles');

const repoRoot = path.resolve(__dirname, '..');
const piecesDir = path.join(repoRoot, 'src/assets/pieces');

const order = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

function uniquifyGradientIds(svg, prefix) {
  const ids = new Set();
  const idRe = /<linearGradient[^>]*\bid="([^"]+)"/g;
  let m;
  while ((m = idRe.exec(svg))) ids.add(m[1]);

  for (const id of ids) {
    const uniqueId = `${prefix}-${id}`;
    svg = svg.replaceAll(`id="${id}"`, `id="${uniqueId}"`);
    svg = svg.replaceAll(`xlink:href="#${id}"`, `xlink:href="#${uniqueId}"`);
    svg = svg.replaceAll(`url(#${id})`, `url(#${uniqueId})`);
  }
  return svg;
}

function inlineStyleAttrs(svg) {
  return svg.replace(/\sstyle="([^"]*)"/g, (_, decls) => {
    const attrs = decls.split(';').map(d => d.trim()).filter(Boolean).map(decl => {
      const [prop, value] = decl.split(':').map(s => s.trim());
      return `${prop}="${value}"`;
    });
    return attrs.length ? ` ${attrs.join(' ')}` : '';
  });
}

const pieceSvgXml = {};

for (const key of order) {
  const file = path.join(piecesDir, `${key}.svg`);
  let svg = fs.readFileSync(file, 'utf8');
  svg = uniquifyGradientIds(svg, key);
  svg = inlineStyleAttrs(svg);
  svg = inlineSvgStyles(svg);
  pieceSvgXml[key] = svg;
}

const entries = order.map(key => `  ${key}: ${JSON.stringify(pieceSvgXml[key])},`).join('\n');

const tsContent = `import type { PieceKey } from './ChessPieceSVG';

// XML-содержимое SVG фигур Spatial (lichess.org, тема spatial),
// сгенерировано scripts/generate-spatial-pieces.js из src/assets/pieces/*.svg.
// id градиентов сделаны уникальными на фигуру, style="..." развёрнут в атрибуты,
// CSS-классы из <style> развёрнуты в атрибуты — react-native-svg SvgXml не поддерживает
// <style> с селекторами по классам.
export const PIECE_SVG_XML: Record<PieceKey, string> = {
${entries}
};
`;

fs.writeFileSync(path.join(repoRoot, 'src/components/chess/pieceSvgXml.ts'), tsContent);

console.log('Готово: src/components/chess/pieceSvgXml.ts обновлён (Spatial)');
