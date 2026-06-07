import { Chess } from 'chess.js';

// Режим «Гандикап»: у игрока король + 3 случайные фигуры против полного комплекта ИИ
export const HANDICAP_ELO = 1200;
export const HANDICAP_SURVIVE_LIMIT = 15;
export const HANDICAP_SURVIVE_POINTS_PER_MOVE = 25;

const HANDICAP_PIECES: Array<'n' | 'b' | 'r'> = ['n', 'b', 'r'];

// Запасной вариант: король e1 + конь/слон/ладья на первой горизонтали — без шаха, есть ходы
const FALLBACK_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/8/2NBK2R w - - 0 1';

function rowToFenString(row: (string | null)[]): string {
  let s = '';
  let empty = 0;
  for (const cell of row) {
    if (cell === null) {
      empty++;
    } else {
      if (empty > 0) { s += empty; empty = 0; }
      s += cell;
    }
  }
  if (empty > 0) s += empty;
  return s;
}

// Случайная пустая клетка в диапазоне рядов 1-3 (rankMin..rankMax)
function pickRandomEmptySquare(
  used: Set<number>,
  rankMin: number,
  rankMax: number,
): { rank: number; file: number } | null {
  const candidates: Array<{ rank: number; file: number }> = [];
  for (let rank = rankMin; rank <= rankMax; rank++) {
    for (let file = 0; file < 8; file++) {
      const r = 8 - rank;
      if (!used.has(r * 8 + file)) candidates.push({ rank, file });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Генерирует стартовую позицию: чёрные — полный комплект, белые — король e1 + 3 случайные фигуры
export function generateHandicapFen(): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const fen = tryBuildHandicapFen();
    if (fen) return fen;
  }
  return FALLBACK_FEN;
}

function tryBuildHandicapFen(): string | null {
  // board[0] = ряд 8 (верх), board[7] = ряд 1 (низ)
  const board: (string | null)[][] = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
  ];

  const used = new Set<number>();
  function place(rank: number, file: number, piece: string) {
    const r = 8 - rank;
    board[r][file] = piece;
    used.add(r * 8 + file);
  }

  // Король белых на e1
  place(1, 4, 'K');

  // 3 случайные фигуры из набора [конь, слон, ладья] на случайных пустых клетках рядов 1-3
  for (const type of HANDICAP_PIECES) {
    const sq = pickRandomEmptySquare(used, 1, 3);
    if (!sq) return null;
    place(sq.rank, sq.file, type.toUpperCase());
  }

  const fenBoard = board.map(rowToFenString).join('/');
  const fen = `${fenBoard} w - - 0 1`;

  try {
    const chess = new Chess(fen);
    if (chess.isCheck()) return null;
    if (chess.moves().length === 0) return null;
    return fen;
  } catch {
    return null;
  }
}

export function calcHandicapSurvivalScore(movesSurvived: number): number {
  return movesSurvived * HANDICAP_SURVIVE_POINTS_PER_MOVE;
}
