// Собирает PIECE_SVG_XML из Fantasy-фигур (src/assets/pieces/*.svg, lichess.org, fantasy theme).
// - разворачивает CSS-классы из <style> в атрибуты (SvgXml не поддерживает <style>)
// - делает id градиентов уникальными на фигуру: у всех 12 SVG одинаковые id
//   (linearGradient2272, base-gradient, ...), и при рендере нескольких <svg> на одной
//   странице url(#id) резолвится в первое совпадение во всём DOM
// Запуск: node scripts/generate-fantasy-pieces.js
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

const pieceSvgXml = {};

for (const key of order) {
  const file = path.join(piecesDir, `${key}.svg`);
  let svg = fs.readFileSync(file, 'utf8');
  svg = uniquifyGradientIds(svg, key);
  svg = inlineSvgStyles(svg);
  pieceSvgXml[key] = svg;
}

const entries = order.map(key => `  ${key}: ${JSON.stringify(pieceSvgXml[key])},`).join('\n');

const tsContent = `import type { PieceKey } from './ChessPieceSVG';

// XML-содержимое SVG фигур Fantasy (lichess.org, тема fantasy),
// сгенерировано scripts/generate-fantasy-pieces.js из src/assets/pieces/*.svg.
// CSS-классы из <style> развёрнуты в атрибуты — react-native-svg SvgXml не поддерживает
// <style> с селекторами по классам. id градиентов сделаны уникальными на фигуру.
export const PIECE_SVG_XML: Record<PieceKey, string> = {
${entries}
};
`;

fs.writeFileSync(path.join(repoRoot, 'src/components/chess/pieceSvgXml.ts'), tsContent);

console.log('Готово: src/components/chess/pieceSvgXml.ts обновлён (Fantasy)');
