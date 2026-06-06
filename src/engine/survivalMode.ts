import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

export const SURVIVAL_MOVE_LIMIT = 25;

type CyclePiece = 'p' | 'n' | 'b' | 'r' | 'q';

// Лимиты белых фигур на доске (кроме короля)
const PIECE_LIMITS: Record<CyclePiece, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

// Базовый FEN как запасной вариант
const FALLBACK_FEN = '6k1/5ppp/8/8/8/8/8/4K3 w - - 0 1';

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

// Выбирает тип фигуры по взвешенным вероятностям с учётом лимитов
// Первые 2 хода → всегда пешка
// Далее: п=15%, к=35%, с=35%, л=20% (если коней≥2), ф=10% (если ладей≥1)
function selectPieceByProbability(board: ReturnType<Chess['board']>, moveIndex: number): CyclePiece | null {
  const counts: Record<CyclePiece, number> = {
    p: countWhitePiece(board, 'p'),
    n: countWhitePiece(board, 'n'),
    b: countWhitePiece(board, 'b'),
    r: countWhitePiece(board, 'r'),
    q: countWhitePiece(board, 'q'),
  };

  // Первые 2 фигуры — всегда пешка
  if (moveIndex < 2) {
    return counts.p < PIECE_LIMITS.p ? 'p' : selectFromAvailable(counts);
  }

  // Взвешенный выбор с учётом условий
  const candidates: Array<{ type: CyclePiece; weight: number }> = [];

  if (counts.p < PIECE_LIMITS.p) candidates.push({ type: 'p', weight: 15 });
  if (counts.n < PIECE_LIMITS.n) candidates.push({ type: 'n', weight: 35 });
  if (counts.b < PIECE_LIMITS.b) candidates.push({ type: 'b', weight: 35 });
  // Ладья доступна только если коней уже 2+
  if (counts.r < PIECE_LIMITS.r && counts.n >= 2) candidates.push({ type: 'r', weight: 20 });
  // Ферзь доступен только если ладей уже 1+
  if (counts.q < PIECE_LIMITS.q && counts.r >= 1) candidates.push({ type: 'q', weight: 10 });

  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((s, x) => s + x.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of candidates) {
    rand -= item.weight;
    if (rand <= 0) return item.type;
  }
  return candidates[candidates.length - 1].type;
}

// Fallback: выбирает любой доступный тип без условий
function selectFromAvailable(counts: Record<CyclePiece, number>): CyclePiece | null {
  const types: CyclePiece[] = ['p', 'n', 'b', 'r', 'q'];
  for (const t of types) {
    if (counts[t] < PIECE_LIMITS[t]) return t;
  }
  return null;
}

// Добавляет белую фигуру на доску (только ряды 1-4, только при ходе королём)
export function addPieceToBoard(fen: string, moveIndex: number): string {
  try {
    const chess = new Chess(fen);
    const board = chess.board();

    const pieceType = selectPieceByProbability(board, moveIndex);
    if (!pieceType) return fen;

    // Только пустые клетки на рядах 1-4 (сторона игрока)
    const empty: Square[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (!board[r][f]) {
          const rankNum = 8 - r;
          if (rankNum >= 1 && rankNum <= 4) {
            const file = String.fromCharCode('a'.charCodeAt(0) + f);
            empty.push(`${file}${rankNum}` as Square);
          }
        }
      }
    }

    if (empty.length === 0) return fen;

    // Пробуем случайные клетки — отклоняем позиции с патом
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
        let empties = 0;
        for (const cell of row) {
          if (!cell) {
            empties++;
          } else {
            if (empties > 0) { s += empties; empties = 0; }
            s += cell;
          }
        }
        if (empties > 0) s += empties;
        return s;
      });

      const newFen = [newRows.join('/'), ...parts.slice(1)].join(' ');

      try {
        const testChess = new Chess(newFen);
        if (testChess.moves().length === 0) continue;
        return newFen;
      } catch {
        continue;
      }
    }

    return fen;
  } catch {
    return fen;
  }
}

// Генерирует стартовую FEN для режима выживания
// Чёрные: король в углу (g8/b8), 3 пешки прикрытия, ферзь, слон, 2 коня, 2 ладьи
// Белые: только король на e1
export function generateSurvivalStartFen(): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const fen = tryBuildSurvivalFen();
    if (fen) return fen;
  }
  return FALLBACK_FEN;
}

// Для обратной совместимости — используется как fallback в тестах
export const SURVIVAL_START_FEN = FALLBACK_FEN;

function tryBuildSurvivalFen(): string | null {
  // board[0] = rank 8 (top), board[7] = rank 1 (bottom)
  const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  const used = new Set<number>();

  function encode(r: number, f: number) { return r * 8 + f; }
  function rankToRow(rank: number) { return 8 - rank; } // rank 8 → row 0

  function place(rank: number, file: number, piece: string) {
    const r = rankToRow(rank);
    board[r][file] = piece;
    used.add(encode(r, file));
  }

  function isFree(rank: number, file: number): boolean {
    const r = rankToRow(rank);
    return !used.has(encode(r, file));
  }

  // Выбираем угол короля
  const kingOnG8 = Math.random() < 0.5;
  const kingFile = kingOnG8 ? 6 : 1; // g=6, b=1
  place(8, kingFile, 'k');

  // Пешки прикрытия
  const pawnFiles = kingOnG8 ? [5, 6, 7] : [0, 1, 2]; // f,g,h или a,b,c
  for (const pf of pawnFiles) {
    place(7, pf, 'p');
  }

  // Белый король на e1
  place(1, 4, 'K');

  // Вспомогательная функция: случайная свободная клетка в диапазоне рядов
  function pickFreeSquare(rankMin: number, rankMax: number): [number, number] | null {
    const candidates: [number, number][] = [];
    for (let rank = rankMin; rank <= rankMax; rank++) {
      for (let file = 0; file < 8; file++) {
        if (isFree(rank, file)) candidates.push([rank, file]);
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Ферзь на рядах 6-7
  const queenSq = pickFreeSquare(6, 7);
  if (!queenSq) return null;
  place(queenSq[0], queenSq[1], 'q');

  // Слон на рядах 6-7
  const bishopSq = pickFreeSquare(6, 7);
  if (!bishopSq) return null;
  place(bishopSq[0], bishopSq[1], 'b');

  // 2 коня на рядах 5-7
  for (let i = 0; i < 2; i++) {
    const sq = pickFreeSquare(5, 7);
    if (!sq) return null;
    place(sq[0], sq[1], 'n');
  }

  // 2 ладьи на рядах 5-7
  for (let i = 0; i < 2; i++) {
    const sq = pickFreeSquare(5, 7);
    if (!sq) return null;
    place(sq[0], sq[1], 'r');
  }

  // Кодируем доску в FEN
  const fenBoard = board.map(row => {
    let s = '';
    let empties = 0;
    for (const cell of row) {
      if (!cell) {
        empties++;
      } else {
        if (empties > 0) { s += empties; empties = 0; }
        s += cell;
      }
    }
    if (empties > 0) s += empties;
    return s;
  }).join('/');

  const fen = `${fenBoard} w - - 0 1`;

  try {
    const chess = new Chess(fen);
    // Позиция валидна и белые не в шахе
    if (chess.isCheck()) return null;
    // Проверяем что у белых есть ходы
    if (chess.moves().length === 0) return null;
    return fen;
  } catch {
    return null;
  }
}
