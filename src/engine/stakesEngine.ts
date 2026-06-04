import { Chess } from 'chess.js';
import type { PieceSymbol, Square } from 'chess.js';

export const BASE_WIN_GOLD = 40;
export const BASE_DRAW_GOLD = 15;
export const BASE_LOSE_GOLD = 5;

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type PieceStakeId = 'none' | 'knight' | 'rook' | 'queen';

export interface PieceStakeConfig {
  id: PieceStakeId;
  pieceType: 'n' | 'r' | 'q' | null;
  label: string;
  symbol: string;
  multiplier: number;
  color: string;
  borderColor: string;
}

export const PIECE_STAKE_CONFIGS: PieceStakeConfig[] = [
  {
    id: 'none',
    pieceType: null,
    label: 'Без ставки',
    symbol: '○',
    multiplier: 1.0,
    color: '#1e293b',
    borderColor: '#475569',
  },
  {
    id: 'knight',
    pieceType: 'n',
    label: 'Конь',
    symbol: '♞',
    multiplier: 2.5,
    color: '#1c1400',
    borderColor: '#ca8a04',
  },
  {
    id: 'rook',
    pieceType: 'r',
    label: 'Ладья',
    symbol: '♜',
    multiplier: 3.0,
    color: '#1c0800',
    borderColor: '#ea580c',
  },
  {
    id: 'queen',
    pieceType: 'q',
    label: 'Ферзь',
    symbol: '♛',
    multiplier: 4.0,
    color: '#1c0000',
    borderColor: '#dc2626',
  },
];

/** Count white pieces of a given type in a FEN string. */
export function countWhitePieceInFen(fen: string | null, pieceType: PieceSymbol): number {
  const boardPart = (fen ?? STARTING_FEN).split(' ')[0];
  const upper = pieceType.toUpperCase();
  return (boardPart.match(new RegExp(upper, 'g')) ?? []).length;
}

/**
 * Remove one white piece of the given type from a FEN position.
 * Returns the modified FEN, or the original if the piece is not found.
 */
export function removePieceFromFen(fen: string | null, pieceType: 'n' | 'r' | 'q'): string {
  const safeFen = fen ?? STARTING_FEN;
  try {
    const chess = new Chess(safeFen);
    const files = 'abcdefgh';
    for (let rank = 1; rank <= 8; rank++) {
      for (let fi = 0; fi < 8; fi++) {
        const square = `${files[fi]}${rank}` as Square;
        const piece = chess.get(square);
        if (piece && piece.type === pieceType && piece.color === 'w') {
          chess.remove(square);
          return chess.fen();
        }
      }
    }
  } catch {
    // invalid FEN — return unchanged
  }
  return safeFen;
}

/** Returns true if the player can stake this piece config given their current FEN. */
export function stakeIsPossible(config: PieceStakeConfig, fen: string | null): boolean {
  if (config.id === 'none') return true;
  if (!config.pieceType) return false;
  return countWhitePieceInFen(fen, config.pieceType) > 0;
}

/**
 * Calculate gold earned after a piece-staked blitz battle.
 * multiplier === 1.0 means no stake — flat base rewards apply.
 * On lose with stake: caller removes the piece from FEN; this returns 0.
 */
export function computePieceStakeGold(
  result: 'win' | 'lose' | 'draw',
  multiplier: number,
): number {
  if (multiplier <= 1.0) {
    if (result === 'win') return BASE_WIN_GOLD;
    if (result === 'draw') return BASE_DRAW_GOLD;
    return BASE_LOSE_GOLD;
  }
  if (result === 'win') return Math.round(BASE_WIN_GOLD * multiplier);
  if (result === 'draw') return BASE_DRAW_GOLD;
  return 0; // lose with stake: piece removed by caller
}
