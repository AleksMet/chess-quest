import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';

export const FLAG_SQUARES: Square[] = ['e4', 'd4', 'e5', 'd5'];
export const FLAG_HOLD_REQUIRED = 3;

export function selectFlagSquare(): Square {
  return FLAG_SQUARES[Math.floor(Math.random() * FLAG_SQUARES.length)];
}

export function isFlagCaptured(fen: string, square: Square, color: Color): boolean {
  try {
    const chess = new Chess(fen);
    const piece = chess.get(square);
    return piece !== null && piece !== undefined && piece.color === color;
  } catch {
    return false;
  }
}
