// Собирает PIECE_SVG_XML из Celtic-фигур (src/assets/pieces/*.svg, Maurizio Monge, MIT).
// - разворачивает CSS-классы из <style> в атрибуты (SvgXml не поддерживает <style>)
// - разворачивает xlink:href у main-gradient на встроенный fillGradient
// Запуск: node scripts/generate-celtic-pieces.js
const fs = require('fs');
const path = require('path');
const { inlineSvgStyles } = require('./lib/inlineSvgStyles');

const repoRoot = path.resolve(__dirname, '..');
const piecesDir = path.join(repoRoot, 'src/assets/pieces');

const order = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

// <linearGradient xlink:href="#fillGradient" id="main-gradient" .../> только наследует
// атрибуты — нужно вставить <stop> из <linearGradient id="fillGradient">...</linearGradient>
// прямо в main-gradient, иначе react-native-svg не подхватит цвета.
// Все 12 фигур используют один и тот же id="main-gradient" — на странице рендерится
// несколько <svg>, и url(#main-gradient) резолвится в первое совпадение во всём DOM,
// поэтому все фигуры красятся в один цвет. Делаем id уникальным на фигуру.
function resolveGradientHref(svg, uniqueId) {
  const mainMatch = svg.match(/<linearGradient xlink:href="#(\w+)" id="([^"]+)"([^>]*)\/>/);
  if (!mainMatch) return svg;
  const [mainTag, refId, mainId, mainRest] = mainMatch;

  const refRe = new RegExp(`<linearGradient id="${refId}">([\\s\\S]*?)</linearGradient>`);
  const refMatch = svg.match(refRe);
  if (!refMatch) return svg;
  const [refTag, stops] = refMatch;

  const merged = `<linearGradient id="${uniqueId}"${mainRest}>${stops}</linearGradient>`;
  return svg.replace(mainTag, merged).replace(refTag, '').replaceAll(`url(#${mainId})`, `url(#${uniqueId})`);
}

const pieceSvgXml = {};

for (const key of order) {
  const file = path.join(piecesDir, `${key}.svg`);
  let svg = fs.readFileSync(file, 'utf8');
  svg = resolveGradientHref(svg, `${key}-gradient`);
  svg = inlineSvgStyles(svg);
  pieceSvgXml[key] = svg;
}

const entries = order.map(key => `  ${key}: ${JSON.stringify(pieceSvgXml[key])},`).join('\n');

const tsContent = `import type { PieceKey } from './ChessPieceSVG';

// XML-содержимое SVG фигур Celtic (Maurizio Monge, MIT license,
// https://github.com/maurimo/chess-art), сгенерировано scripts/generate-celtic-pieces.js
// из src/assets/pieces/*.svg. CSS-классы из <style> развёрнуты в атрибуты — react-native-svg
// SvgXml не поддерживает <style> с селекторами по классам.
export const PIECE_SVG_XML: Record<PieceKey, string> = {
${entries}
};
`;

fs.writeFileSync(path.join(repoRoot, 'src/components/chess/pieceSvgXml.ts'), tsContent);

console.log('Готово: src/components/chess/pieceSvgXml.ts обновлён (Celtic)');
