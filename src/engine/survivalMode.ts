import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

export const SURVIVAL_MOVE_LIMIT = 25;

// Цикл добавляемых фигур
const PIECE_CYCLE = ['p', 'n', 'b', 'r', 'q'] as const;
type CyclePiece = typeof PIECE_CYCLE[number];

// Лимиты белых фигур на доске (кроме короля)
const PIECE_LIMITS: Record<CyclePiece, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

// Начальная FEN: только белый король на e1, у чёрных полный набор
export const SURVIVAL_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/8/4K3 w - - 0 1';

// Считает количество белых фигур заданного типа на доске
function countWhitePiece(board: ReturnType<Chess['board']>, type: CyclePiece): number {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq && sq.color === 'w' && sq.type === type) count++;
    }
  }
  return count;
}

// Выбирает следующий тип фигуры из цикла с учётом лимитов на доске
function selectPieceType(board: ReturnType<Chess['board']>, moveIndex: number): CyclePiece | null {
  for (let offset = 0; offset < PIECE_CYCLE.length; offset++) {
    const candidate = PIECE_CYCLE[(moveIndex + offset) % PIECE_CYCLE.length];
    if (countWhitePiece(board, candidate) < PIECE_LIMITS[candidate]) {
      return candidate;
    }
  }
  return null; // все лимиты достигнуты
}

export function addPieceToBoard(fen: string, moveIndex: number): string {
  try {
    const chess = new Chess(fen);
    const board = chess.board();

    const pieceType = selectPieceType(board, moveIndex);
    if (!pieceType) return fen; // все лимиты достигнуты

    // Только пустые клетки на рядах 1-4 (сторона игрока)
    const empty: Square[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (!board[r][f]) {
          const rankNum = 8 - r; // r=7 → rank1, r=4 → rank4
          if (rankNum >= 1 && rankNum <= 4) {
            const file = String.fromCharCode('a'.charCodeAt(0) + f);
            empty.push(`${file}${rankNum}` as Square);
          }
        }
      }
    }

    if (empty.length === 0) return fen;

    // Пробуем разные клетки пока не получим валидную позицию без пата
    const shuffled = [...empty].sort(() => Math.random() - 0.5);
    for (const target of shuffled) {
      const parts = fen.split(' ');
      const boardPart = parts[0];

      const rows = boardPart.split('/');
      const grid: (string | null)[][] = rows.map(row => {
        const cells: (string | null)[] = [];
        for (const ch of row) {
          const n = parseInt(ch, 10);
          if (!isNaN(n)) {
            for (let i = 0; i < n; i++) cells.push(null);
          } else {
            cells.push(ch);
          }
        }
        return cells;
      });

      const fileIdx = target.charCodeAt(0) - 'a'.charCodeAt(0);
      const rankIdx = 8 - parseInt(target[1], 10);
      grid[rankIdx][fileIdx] = pieceType.toUpperCase();

      const newRows = grid.map(row => {
        let s = '';
        let empty = 0;
        for (const cell of row) {
          if (!cell) {
            empty++;
          } else {
            if (empty > 0) { s += empty; empty = 0; }
            s += cell;
          }
        }
        if (empty > 0) s += empty;
        return s;
      });

      const newFen = [newRows.join('/'), ...parts.slice(1)].join(' ');

      try {
        const testChess = new Chess(newFen);
        // Отклоняем позицию если у белых нет легальных ходов (пат или мат)
        if (testChess.moves().length === 0) continue;
        return newFen;
      } catch {
        continue;
      }
    }

    return fen; // не удалось разместить без пата
  } catch {
    return fen;
  }
}
