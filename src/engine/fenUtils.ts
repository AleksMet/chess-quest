// Убирает пешки с 1-й и 8-й горизонталей — chess.js бросает исключение
// если пешка стоит на крайнем ряду (недопустимая позиция по правилам).
export function sanitizeFen(fen: string): string {
  const parts = fen.split(' ')
  const rows = parts[0].split('/')

  const stripPawns = (row: string): string => {
    const cleaned = row.replace(/[pP]/g, '1')
    let result = ''
    let count = 0
    for (const ch of cleaned) {
      if (/\d/.test(ch)) {
        count += parseInt(ch, 10)
      } else {
        if (count > 0) { result += count; count = 0 }
        result += ch
      }
    }
    if (count > 0) result += count
    return result
  }

  rows[0] = stripPawns(rows[0])  // 8-я горизонталь
  rows[7] = stripPawns(rows[7])  // 1-я горизонталь

  parts[0] = rows.join('/')
  return parts.join(' ')
}
