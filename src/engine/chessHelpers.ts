import { Chess } from 'chess.js';

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Build boss battle FEN from the player's post-run FEN.
 *
 * White (player) pieces are placed on their standard home squares using
 * the exact piece count from currentFen:
 *   K → e1    Q → d1    R(1) → a1, R(2) → h1
 *   B(1) → c1, B(2) → f1    N(1) → b1, N(2) → g1
 *   Pawns → a2..h2 (left-to-right)
 *
 * Black (boss) always uses the full standard complement.
 * Returns the standard FEN on any error or invalid result.
 */
export function buildBossFen(currentFen: string | null): string {
  if (!currentFen) return STANDARD_FEN;

  try {
    // Count white pieces in the player's FEN
    const boardPart = currentFen.split(' ')[0];
    const counts = countPieces(boardPart);

    // Build rows 1-2 (white pieces) and rows 7-8 (black pieces)
    const whiteRow2 = buildPawnRow(counts.P); // rank 2
    const whiteRow1 = buildHomeRow(counts);   // rank 1
    const blackRow8 = 'rnbqkbnr';              // rank 8 — always full
    const blackRow7 = 'pppppppp';              // rank 7 — always full

    // Middle ranks are empty
    const emptyRow = '8';

    const fenBoard = [
      blackRow8,
      blackRow7,
      emptyRow, emptyRow, emptyRow, emptyRow,
      whiteRow2,
      whiteRow1,
    ].join('/');

    const fen = `${fenBoard} w - - 0 1`;

    // Validate: neither king should start in check
    const chess = new Chess(fen);
    if (chess.isCheck()) return STANDARD_FEN;
    const chessB = new Chess(fen.replace(' w ', ' b '));
    if (chessB.isCheck()) return STANDARD_FEN;

    return fen;
  } catch {
    return STANDARD_FEN;
  }
}

interface PieceCounts {
  K: number; Q: number; R: number; B: number; N: number; P: number;
}

function countPieces(boardPart: string): PieceCounts {
  const count = (ch: string) => (boardPart.match(new RegExp(ch, 'g')) ?? []).length;
  return {
    K: Math.min(count('K'), 1), // always exactly 1 king
    Q: Math.min(count('Q'), 1),
    R: Math.min(count('R'), 2),
    B: Math.min(count('B'), 2),
    N: Math.min(count('N'), 2),
    P: Math.min(count('P'), 8),
  };
}

// Build rank-1 FEN segment for white home pieces (K always on e1)
function buildHomeRow(c: PieceCounts): string {
  // Standard layout: R N B Q K B N R = a1 b1 c1 d1 e1 f1 g1 h1
  const squares: (string | null)[] = [null, null, null, null, null, null, null, null];
  // King always on e1 (index 4)
  squares[4] = 'K';
  // Queen on d1 (index 3)
  if (c.Q >= 1) squares[3] = 'Q';
  // Rooks: a1 (0), h1 (7)
  if (c.R >= 1) squares[0] = 'R';
  if (c.R >= 2) squares[7] = 'R';
  // Bishops: c1 (2), f1 (5)
  if (c.B >= 1) squares[2] = 'B';
  if (c.B >= 2) squares[5] = 'B';
  // Knights: b1 (1), g1 (6)
  if (c.N >= 1) squares[1] = 'N';
  if (c.N >= 2) squares[6] = 'N';

  return toFenRow(squares);
}

// Build rank-2 FEN segment for white pawns (left-to-right)
function buildPawnRow(pawnCount: number): string {
  const squares: (string | null)[] = Array(8).fill(null);
  for (let i = 0; i < Math.min(pawnCount, 8); i++) {
    squares[i] = 'P';
  }
  return toFenRow(squares);
}

function toFenRow(squares: (string | null)[]): string {
  let row = '';
  let empty = 0;
  for (const sq of squares) {
    if (sq === null) {
      empty++;
    } else {
      if (empty > 0) { row += empty; empty = 0; }
      row += sq;
    }
  }
  if (empty > 0) row += empty;
  return row;
}

// Re-export detectFork / detectPin from utils so callers can use a single import path
export { detectFork, detectPin } from '../utils/chessHelpers';
export type { ForkResult, PinResult } from '../types';

// ── Additional helpers used by rewardEngine ───────────────────────────────────
export { detectOpenFile } from '../utils/chessHelpers';
