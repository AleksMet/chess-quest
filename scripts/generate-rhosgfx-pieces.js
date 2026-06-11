// Готовит ассеты RhosGFX: копирует белые SVG-фигуры и доску, генерирует
// зелёные версии фигур (градиент) и собирает карту PIECE_SVG_XML для ChessPiece.
// Запуск: node scripts/generate-rhosgfx-pieces.js <путь до vector-chess-pieces>
const fs = require('fs');
const path = require('path');

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('Usage: node scripts/generate-rhosgfx-pieces.js <vector-chess-pieces dir>');
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..');
const whiteOutDir = path.join(repoRoot, 'src/assets/chess-pieces/white');
const greenOutDir = path.join(repoRoot, 'src/assets/chess-pieces/green');
const boardOutDir = path.join(repoRoot, 'src/assets/chess-pieces/board');

const PIECE_FILES = [
  { src: 'King White Outline.svg', white: 'wK.svg', green: 'bK.svg' },
  { src: 'Queen White Outline.svg', white: 'wQ.svg', green: 'bQ.svg' },
  { src: 'Rook White Outline.svg', white: 'wR.svg', green: 'bR.svg' },
  { src: 'Bishop White Outline.svg', white: 'wB.svg', green: 'bB.svg' },
  { src: 'Knight White Outline.svg', white: 'wN.svg', green: 'bN.svg' },
  { src: 'Pawn White Outline.svg', white: 'wP.svg', green: 'bP.svg' },
];

const GREEN_GRADIENTS = `
    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7ecf82"/>
      <stop offset="100%" stop-color="#1a5c1e"/>
    </linearGradient>
    <linearGradient id="greenAccent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4a9e50"/>
      <stop offset="100%" stop-color="#0f3a12"/>
    </linearGradient>`;

function toGreen(svg) {
  let out = svg;
  out = out.replace('<defs>', `<defs>${GREEN_GRADIENTS}`);
  out = out.replace(/(\.cls-1\s*\{\s*fill:\s*)#fff(\s*;\s*\})/, '$1url(#greenGrad)$2');
  out = out.replace(/(\.cls-2\s*\{\s*fill:\s*)#cef(\s*;\s*\})/, '$1url(#greenAccent)$2');
  out = out.replace(/(\.cls-3,\s*\.cls-4\s*\{\s*fill:\s*)#1a1a1a(\s*;\s*\})/, '$1#0a2a0c$2');
  out = out.replace(/(\.cls-5\s*\{\s*fill:\s*)#96dbff(\s*;\s*\})/, '$1#bff2c2$2');
  return out;
}

const pieceSvgXml = {};

for (const { src, white, green } of PIECE_FILES) {
  const content = fs.readFileSync(path.join(sourceDir, 'White', src), 'utf8');
  fs.writeFileSync(path.join(whiteOutDir, white), content);
  // SvgXml не нуждается в XML-декларации — убираем её для встраиваемой строки
  const stripDeclaration = (svg) => svg.replace(/^<\?xml[^>]*\?>\s*/, '');
  pieceSvgXml[white.replace('.svg', '')] = stripDeclaration(content);

  const greenSvg = toGreen(content);
  fs.writeFileSync(path.join(greenOutDir, green), greenSvg);
  pieceSvgXml[green.replace('.svg', '')] = stripDeclaration(greenSvg);
}

fs.copyFileSync(path.join(sourceDir, 'Board Blue.svg'), path.join(boardOutDir, 'board.svg'));

const order = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
const entries = order.map(key => `  ${key}: ${JSON.stringify(pieceSvgXml[key])},`).join('\n');

const tsContent = `import type { PieceKey } from './ChessPieceSVG';

// XML-содержимое SVG фигур RhosGFX (белые — оригинал, зелёные — сгенерированы
// scripts/generate-rhosgfx-pieces.js из src/assets/chess-pieces/white).
export const PIECE_SVG_XML: Record<PieceKey, string> = {
${entries}
};
`;

fs.writeFileSync(path.join(repoRoot, 'src/components/chess/pieceSvgXml.ts'), tsContent);

console.log('Готово: white/, green/, board/board.svg, src/components/chess/pieceSvgXml.ts');
