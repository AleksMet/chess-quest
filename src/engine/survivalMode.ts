import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

export const SURVIVAL_MOVE_LIMIT = 25;

// Piece addition cycle (repeats after queen)
const PIECE_CYCLE = ['p', 'n', 'b', 'r', 'q'] as const;
type CyclePiece = typeof PIECE_CYCLE[number];

// Starting FEN: white king on e1 only, black has full complement
export const SURVIVAL_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/8/4K3 w - - 0 1';

export function addPieceToBoard(fen: string, moveIndex: number): string {
  try {
    const chess = new Chess(fen);
    const pieceType: CyclePiece = PIECE_CYCLE[moveIndex % PIECE_CYCLE.length];

    // Gather empty squares
    const board = chess.board();
    const empty: Square[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (!board[r][f]) {
          const file = String.fromCharCode('a'.charCodeAt(0) + f);
          const rank = String(8 - r);
          empty.push(`${file}${rank}` as Square);
        }
      }
    }

    if (empty.length === 0) return fen;

    // Pick a random empty square
    const target = empty[Math.floor(Math.random() * empty.length)];

    // Use FEN string manipulation to place the piece
    const parts = fen.split(' ');
    const boardPart = parts[0];

    // Parse board into 8x8 array of chars
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

    // Place the piece
    const fileIdx = target.charCodeAt(0) - 'a'.charCodeAt(0);
    const rankIdx = 8 - parseInt(target[1], 10);
    grid[rankIdx][fileIdx] = pieceType.toUpperCase(); // white piece

    // Re-encode board rows
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

    // Validate — if the placement causes an illegal state, return original
    new Chess(newFen);
    return newFen;
  } catch {
    return fen;
  }
}
