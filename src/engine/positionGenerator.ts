import { Chess } from 'chess.js';
import type { PieceSymbol } from 'chess.js';
import { QUICK_BATTLE_POSITIONS, PRE_BOSS_POSITIONS } from '../data/battlePositions';

/** Count white pieces of a given type in a FEN string (falls back to starting FEN on null). */
export function countWhitePieceInFen(fen: string | null, pieceType: PieceSymbol): number {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const boardPart = (fen ?? STARTING_FEN).split(' ')[0];
  return (boardPart.match(new RegExp(pieceType.toUpperCase(), 'g')) ?? []).length;
}

// ── Dynamic ambush position generator ────────────────────────────────────────
// Player (white): king + 4-5 pieces (n, b, p only — no queen, no rook)
// Enemy (black):  king + 7-8 pieces (r, n, b, p — no queen)
// Guarantees: valid FEN, white king not in check

function boardToFen(board: (string | null)[][]): string {
  return board.map(row => {
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
  }).join('/');
}

export function generateAmbushPosition(): string {
  const MAX_ATTEMPTS = 80;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // board[0] = rank 8 (top), board[7] = rank 1 (bottom)
    const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
    const used = new Set<number>(); // encoded as rank*8+file

    function encode(rank: number, file: number) { return rank * 8 + file; }

    function pickSquare(rankMin = 0, rankMax = 7): [number, number] | null {
      for (let t = 0; t < 60; t++) {
        const ri = rankMin + Math.floor(Math.random() * (rankMax - rankMin + 1));
        const fi = Math.floor(Math.random() * 8);
        if (!used.has(encode(ri, fi))) return [ri, fi];
      }
      return null;
    }

    function place(ri: number, fi: number, piece: string) {
      board[ri][fi] = piece;
      used.add(encode(ri, fi));
    }

    // board rank index → chess rank number (0 = rank8, 7 = rank1)
    function rankNum(ri: number) { return 8 - ri; }

    // Place white king (ranks 1-6 to avoid promotions, any file)
    const wk = pickSquare(1, 6);
    if (!wk) continue;
    place(wk[0], wk[1], 'K');

    // Place black king — must not be adjacent to white king
    let bkPlaced = false;
    for (let t = 0; t < 60; t++) {
      const sq = pickSquare(1, 6);
      if (!sq) break;
      const [ri, fi] = sq;
      if (Math.abs(ri - wk[0]) > 1 || Math.abs(fi - wk[1]) > 1) {
        place(ri, fi, 'k');
        bkPlaced = true;
        break;
      }
    }
    if (!bkPlaced) continue;

    // Add 7-8 black pieces (r, n, b, p — no queen)
    const bPieces = ['r', 'n', 'b', 'p'];
    const bCount = 7 + Math.floor(Math.random() * 2);
    let bAdded = 0;
    for (let t = 0; t < bCount * 4 && bAdded < bCount; t++) {
      const sq = pickSquare();
      if (!sq) break;
      const [ri, fi] = sq;
      const type = bPieces[Math.floor(Math.random() * bPieces.length)];
      const rank = rankNum(ri);
      if (type === 'p' && (rank === 1 || rank === 8)) continue;
      place(ri, fi, type);
      bAdded++;
    }

    // Add 4-5 white pieces (n, b, p — no queen, no rook)
    const wPieces = ['N', 'B', 'P'];
    const wCount = 4 + Math.floor(Math.random() * 2);
    let wAdded = 0;
    for (let t = 0; t < wCount * 4 && wAdded < wCount; t++) {
      const sq = pickSquare();
      if (!sq) break;
      const [ri, fi] = sq;
      const type = wPieces[Math.floor(Math.random() * wPieces.length)];
      const rank = rankNum(ri);
      if (type === 'P' && (rank === 1 || rank === 8)) continue;
      // Avoid putting a pawn on rank 7 giving illusion of promotion
      if (type === 'P' && rank === 7) {
        // Allow but skip rank 7 with 50% chance
        if (Math.random() < 0.5) continue;
      }
      place(ri, fi, type);
      wAdded++;
    }

    // Verify: white king must not be in check when it's white's turn
    const fenBoard = boardToFen(board);
    const fen = `${fenBoard} w - - 0 1`;
    try {
      const chess = new Chess(fen);
      if (!chess.isCheck()) {
        // Also verify that black king is not in check (would be illegal position)
        // Swap turn to black and check
        const blackTurnFen = `${fenBoard} b - - 0 1`;
        const chessB = new Chess(blackTurnFen);
        if (!chessB.isCheck()) return fen;
      }
    } catch {
      continue;
    }
  }

  // Fallback: a guaranteed unequal static position
  return '2b1k3/rpp1pp2/2n5/8/8/2N5/PPP5/2B1K3 w - - 0 1';
}

export function generateQuickBattlePosition(isPreBoss = false): string {
  const pool = isPreBoss ? PRE_BOSS_POSITIONS : QUICK_BATTLE_POSITIONS;
  const entropy = (Date.now() + Math.random() * 1e9) >>> 0;
  const idx = entropy % pool.length;
  return pool[idx];
}

/** Count material value for one side. Q=9 R=5 B=3 N=3 P=1 */
export function countMaterial(chess: Chess, color: 'w' | 'b'): number {
  const VALUES: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
  let total = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.color === color) total += VALUES[sq.type] ?? 0;
    }
  }
  return total;
}
