// react-native-svg's SvgXml не поддерживает <style> с CSS-классами (.cls-1 { fill: ... }) —
// без обработки фигуры рендерятся с заливкой по умолчанию (чёрной). Эта функция
// разворачивает классы из <style> в атрибуты прямо на элементах и удаляет <style>.
function inlineSvgStyles(svg) {
  const styleMatch = svg.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) return svg;

  const css = styleMatch[1];
  const classMap = {};
  const ruleRe = /([^{}]+)\{([^}]+)\}/g;
  let match;
  while ((match = ruleRe.exec(css))) {
    const selectors = match[1].split(',').map(s => s.trim().replace(/^\./, ''));
    const decls = match[2].split(';').map(d => d.trim()).filter(Boolean);
    for (const selector of selectors) {
      classMap[selector] = (classMap[selector] || []).concat(decls);
    }
  }

  let out = svg.replace(/\sclass="([^"]+)"/g, (_, classes) => {
    const attrs = [];
    for (const cls of classes.split(/\s+/)) {
      for (const decl of classMap[cls] || []) {
        const [prop, value] = decl.split(':').map(s => s.trim());
        attrs.push(`${prop}="${value}"`);
      }
    }
    return attrs.length ? ` ${attrs.join(' ')}` : '';
  });

  out = out.replace(/\s*<style>[\s\S]*?<\/style>\s*/, '\n');
  out = out.replace(/<defs>\s*<\/defs>\s*/, '');

  return out;
}

module.exports = { inlineSvgStyles };
