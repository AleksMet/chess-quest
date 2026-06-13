// Собирает PIECE_SVG_XML из Cburnett-фигур (src/assets/pieces/*.svg, lichess.org, тема cburnett)
// с применёнными градиентами (apply-cburnett-colors.js).
// - делает id градиентов уникальными на фигуру (все белые/чёрные фигуры используют
//   общие id "wGrad"/"bGrad", которые коллизируют в общем DOM react-native-web)
// Запуск: node scripts/generate-cburnett-pieces.js
const fs = require('fs');
const path = require('path');

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
  pieceSvgXml[key] = svg;
}

const entries = order.map(key => `  ${key}: ${JSON.stringify(pieceSvgXml[key])},`).join('\n');

const tsContent = `import type { PieceKey } from './ChessPieceSVG';

// XML-содержимое SVG фигур Cburnett (lichess.org, тема cburnett) с градиентами,
// сгенерировано scripts/generate-cburnett-pieces.js из src/assets/pieces/*.svg.
// id градиентов сделаны уникальными на фигуру.
export const PIECE_SVG_XML: Record<PieceKey, string> = {
${entries}
};
`;

fs.writeFileSync(path.join(repoRoot, 'src/components/chess/pieceSvgXml.ts'), tsContent);

console.log('Готово: src/components/chess/pieceSvgXml.ts обновлён (Cburnett)');
