import { Chess } from 'chess.js';
import type { PieceSymbol } from 'chess.js';

/** Count white pieces of a given type in a FEN string (falls back to starting FEN on null). */
export function countWhitePieceInFen(fen: string | null, pieceType: PieceSymbol): number {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const boardPart = (fen ?? STARTING_FEN).split(' ')[0];
  return (boardPart.match(new RegExp(pieceType.toUpperCase(), 'g')) ?? []).length;
}

// Curated middlegame FENs: 8-10 pieces per side, balanced material, no check
const QUICK_BATTLE_POSITIONS: string[] = [
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
  'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
  'rnbqk2r/pp2bppp/2p1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6',
  'r2q1rk1/ppp1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 2 8',
  'r1bqr1k1/pp2bppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R1BQ1RK1 w - - 4 9',
  'r1b2rk1/ppq1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPPQ1PPP/R1B2RK1 w - - 6 10',
  'r4rk1/pp1nqppp/2pb1n2/4p3/4P3/1NNP1B2/PPP1QPPP/R4RK1 w - - 0 12',
  'r2q1rk1/1pp1bppp/p1np1n2/4p3/4P3/1NNP1B2/PPP1QPPP/R3KR1 w Q - 2 11',
  'r1bq1rk1/pp3ppp/2n2n2/3pp3/1bB1P3/2NP1N2/PPP1QPPP/R1B2RK1 w - - 2 9',
  'r2qr1k1/ppp1bppp/2n2n2/4p3/2B1P3/2N2N2/PPP1QPPP/R1B2RK1 w - - 4 10',
  '2rq1rk1/pp2bppp/2np1n2/4p3/4P3/2NP1NB1/PPP1BPPP/R2Q1RK1 w - - 0 11',
  'r1bqr1k1/1pp2ppp/p1np1n2/2b1p3/2B1P3/P1NP1N2/1PP1QPPP/R1B2RK1 w - - 2 9',
  // additional positions to reduce repeats
  'r2q1rk1/pp2bppp/2n1pn2/3p4/3P1B2/2NB1N2/PPP1QPPP/R4RK1 w - - 2 11',
  'r1bq1rk1/1pp2ppp/p1np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8',
  'r2qrbk1/ppp2ppp/2n2n2/4p3/2B1P3/2N1BN2/PPP2PPP/R2Q1RK1 w - - 6 10',
  'r1bqr1k1/pp3ppp/2n1pn2/2pp4/2PP4/2NBPN2/PP3PPP/R1BQR1K1 w - - 2 9',
  '2rqr1k1/pp1nbppp/2p1pn2/3p4/3P1B2/2NBPN2/PPP2PPP/R2QR1K1 w - - 4 10',
  'r2q1rk1/ppp1nppp/1bn1p3/3pN3/3P1B2/2N1P3/PPP2PPP/R2QKB1R w KQ - 4 9',
  'r1b2rk1/pp1qbppp/2nppn2/8/3NP3/2N1BP2/PPP1BPPP/R2Q1RK1 w - - 2 10',
  'r2r2k1/pp1qbppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP3PPP/R2QR1K1 w - - 0 11',
];

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

export function generateQuickBattlePosition(): string {
  const idx = Math.floor(Math.random() * QUICK_BATTLE_POSITIONS.length);
  return QUICK_BATTLE_POSITIONS[idx];
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
