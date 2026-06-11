// Одноразовый фикс: разворачивает CSS-классы (.cls-1 { fill: ... }) в атрибуты
// прямо в существующих ассетах white/green и пересобирает pieceSvgXml.ts.
// Запуск: node scripts/fix-piece-svg-styles.js
const fs = require('fs');
const path = require('path');
const { inlineSvgStyles } = require('./lib/inlineSvgStyles');

const repoRoot = path.resolve(__dirname, '..');
const whiteDir = path.join(repoRoot, 'src/assets/chess-pieces/white');
const greenDir = path.join(repoRoot, 'src/assets/chess-pieces/green');

const order = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
const pieceSvgXml = {};

for (const key of order) {
  const dir = key.startsWith('w') ? whiteDir : greenDir;
  const file = path.join(dir, `${key}.svg`);
  const content = fs.readFileSync(file, 'utf8');
  const fixed = inlineSvgStyles(content);
  fs.writeFileSync(file, fixed);
  pieceSvgXml[key] = fixed;
}

const entries = order.map(key => `  ${key}: ${JSON.stringify(pieceSvgXml[key])},`).join('\n');

const tsContent = `import type { PieceKey } from './ChessPieceSVG';

// XML-содержимое SVG фигур RhosGFX (белые — оригинал, зелёные — сгенерированы
// scripts/generate-rhosgfx-pieces.js из src/assets/chess-pieces/white).
// CSS-классы из <style> развёрнуты в атрибуты — react-native-svg SvgXml не
// поддерживает <style> с селекторами по классам.
export const PIECE_SVG_XML: Record<PieceKey, string> = {
${entries}
};
`;

fs.writeFileSync(path.join(repoRoot, 'src/components/chess/pieceSvgXml.ts'), tsContent);

console.log('Готово: white/, green/, src/components/chess/pieceSvgXml.ts');
