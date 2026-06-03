import { Chess } from 'chess.js';
import type { Move, Square, Color } from 'chess.js';

export interface MoveResult {
  success: boolean;
  move: Move | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isPromotion: boolean;
}

export interface GameStatus {
  isOver: boolean;
  result: 'checkmate' | 'stalemate' | 'draw' | 'ongoing';
  winner: Color | null;
}

/**
 * Creates a new Chess instance with the starting position.
 */
export function createGame(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess();
}

/**
 * Attempts a move. Returns MoveResult with outcome details.
 * All validation is handled by chess.js.
 */
export function attemptMove(
  chess: Chess,
  from: Square,
  to: Square,
  promotion?: string
): MoveResult {
  try {
    const move = chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined });
    if (!move) {
      return { success: false, move: null, isCheck: false, isCheckmate: false, isStalemate: false, isDraw: false, isPromotion: false };
    }
    return {
      success: true,
      move,
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isPromotion: move.flags.includes('p'),
    };
  } catch {
    return { success: false, move: null, isCheck: false, isCheckmate: false, isStalemate: false, isDraw: false, isPromotion: false };
  }
}

/**
 * Returns the current game status.
 */
export function getGameStatus(chess: Chess): GameStatus {
  if (chess.isCheckmate()) {
    // The side that just moved won (the one whose turn it was to move LOST)
    const loser = chess.turn();
    const winner: Color = loser === 'w' ? 'b' : 'w';
    return { isOver: true, result: 'checkmate', winner };
  }
  if (chess.isStalemate()) {
    return { isOver: true, result: 'stalemate', winner: null };
  }
  if (chess.isDraw()) {
    return { isOver: true, result: 'draw', winner: null };
  }
  return { isOver: false, result: 'ongoing', winner: null };
}

/**
 * Returns all legal moves for a piece on a given square.
 */
export function getLegalMovesFrom(chess: Chess, square: Square): Move[] {
  return chess.moves({ square, verbose: true });
}

/**
 * Returns all legal moves in the current position.
 */
export function getAllLegalMoves(chess: Chess): Move[] {
  return chess.moves({ verbose: true });
}

/**
 * Checks whether a square is attacked by the given color.
 */
export function isSquareAttackedBy(chess: Chess, square: Square, color: Color): boolean {
  return chess.isAttacked(square, color);
}

/**
 * Returns the FEN string for the current position.
 */
export function getFen(chess: Chess): string {
  return chess.fen();
}

/**
 * Returns whose turn it is.
 */
export function getCurrentTurn(chess: Chess): Color {
  return chess.turn();
}

/**
 * Checks if the current position allows castling (kingside).
 * chess.js validates castling automatically when performing moves.
 */
export function canCastleKingside(chess: Chess, color: Color): boolean {
  const rights = chess.getCastlingRights(color);
  return rights.k;
}

/**
 * Checks if the current position allows castling (queenside).
 */
export function canCastleQueenside(chess: Chess, color: Color): boolean {
  const rights = chess.getCastlingRights(color);
  return rights.q;
}
