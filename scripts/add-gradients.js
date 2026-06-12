// Добавляет градиент белым фигурам RhosGFX (зелёные уже получили градиент
// в scripts/generate-rhosgfx-pieces.js). Обновляет исходники в
// src/assets/chess-pieces/white/*.svg и встроенные строки в pieceSvgXml.ts.
// Запуск: node scripts/add-gradients.js
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const whiteDir = path.join(repoRoot, 'src/assets/chess-pieces/white');
const pieceSvgXmlPath = path.join(repoRoot, 'src/components/chess/pieceSvgXml.ts');

const WHITE_PIECES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'];

const WHITE_GRADIENTS = `
    <linearGradient id="wGrad" x1="0.2" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#c8b890"/>
    </linearGradient>
    <linearGradient id="wAccent" x1="0.2" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0e6d2"/>
      <stop offset="100%" stop-color="#a8966c"/>
    </linearGradient>`;

function applyGradient(svg) {
  let out = svg;
  if (!out.includes('<defs>')) {
    out = out.replace(/(<svg[^>]*>)/, `$1\n  <defs>${WHITE_GRADIENTS}\n</defs>`);
  } else {
    out = out.replace('<defs>', `<defs>${WHITE_GRADIENTS}`);
  }
  out = out.replace(/fill="#fff"/g, 'fill="url(#wGrad)"');
  out = out.replace(/fill="#cef"/g, 'fill="url(#wAccent)"');
  out = out.replace(/fill="#96dbff"/g, 'fill="#fdf6e3"');
  return out;
}

let pieceSvgXmlContent = fs.readFileSync(pieceSvgXmlPath, 'utf8');

for (const piece of WHITE_PIECES) {
  const file = path.join(whiteDir, `${piece}.svg`);
  const svg = applyGradient(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, svg);

  const stripDeclaration = (s) => s.replace(/^<\?xml[^>]*\?>\s*/, '');
  const inlineSvg = stripDeclaration(svg);
  const lineRegex = new RegExp(`^  ${piece}: ".*",$`, 'm');
  pieceSvgXmlContent = pieceSvgXmlContent.replace(lineRegex, `  ${piece}: ${JSON.stringify(inlineSvg)},`);

  console.log(`✅ ${piece}.svg обновлён`);
}

fs.writeFileSync(pieceSvgXmlPath, pieceSvgXmlContent);
console.log('✅ pieceSvgXml.ts обновлён');
