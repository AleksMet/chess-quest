import { Chess } from 'chess.js';
import type { Move, Square, Color, PieceSymbol } from 'chess.js';
import type { ForkResult, PinResult, OpenFileResult, AttackedPiece } from '../types';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

/**
 * Detects if a move creates a fork: a single piece attacks 2+ opponent pieces.
 */
export function detectFork(chess: Chess, move: Move): ForkResult {
  const attackerSquare = move.to as Square;
  const attackerColor: Color = move.color;
  const opponentColor: Color = attackerColor === 'w' ? 'b' : 'w';

  const board = chess.board();
  const attacked: AttackedPiece[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const cell = board[rank][file];
      if (!cell || cell.color !== opponentColor) continue;

      const targetSquare = cell.square as Square;
      if (chess.isAttacked(targetSquare, attackerColor)) {
        // Make sure the attack comes from the moved piece, not another piece
        // We check this by seeing if the attacker square attacks the target
        if (isSquareAttackingTarget(chess, attackerSquare, targetSquare, attackerColor)) {
          attacked.push({
            square: targetSquare,
            piece: cell.type,
            color: cell.color,
          });
        }
      }
    }
  }

  // A fork requires attacking 2+ opponent pieces, at least one of which is not a pawn OR includes the king
  const isFork = attacked.length >= 2;

  return {
    isFork,
    attackedPieces: attacked,
  };
}

/**
 * Returns true if the piece on attackerSquare attacks targetSquare.
 * Uses manual geometry so it's correct regardless of whose turn it is.
 */
function isSquareAttackingTarget(
  chess: Chess,
  attackerSquare: Square,
  targetSquare: Square,
  attackerColor: Color
): boolean {
  const piece = chess.get(attackerSquare);
  if (!piece || piece.color !== attackerColor) return false;

  const fA = attackerSquare.charCodeAt(0) - 97;
  const rA = parseInt(attackerSquare[1]) - 1;
  const fT = targetSquare.charCodeAt(0) - 97;
  const rT = parseInt(targetSquare[1]) - 1;
  const df = fT - fA;
  const dr = rT - rA;

  switch (piece.type) {
    case 'n':
      return (Math.abs(df) === 1 && Math.abs(dr) === 2) ||
             (Math.abs(df) === 2 && Math.abs(dr) === 1);
    case 'p': {
      const dir = attackerColor === 'w' ? 1 : -1;
      return dr === dir && Math.abs(df) === 1;
    }
    case 'k':
      return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0);
    case 'b':
      if (Math.abs(df) !== Math.abs(dr) || df === 0) return false;
      return !isRayBlocked(chess, fA, rA, fT, rT, df / Math.abs(df), dr / Math.abs(dr));
    case 'r':
      if (df !== 0 && dr !== 0) return false;
      return !isRayBlocked(chess, fA, rA, fT, rT,
        df === 0 ? 0 : df / Math.abs(df),
        dr === 0 ? 0 : dr / Math.abs(dr));
    case 'q':
      if (Math.abs(df) === Math.abs(dr) && df !== 0)
        return !isRayBlocked(chess, fA, rA, fT, rT, df / Math.abs(df), dr / Math.abs(dr));
      if (df === 0 || dr === 0)
        return !isRayBlocked(chess, fA, rA, fT, rT,
          df === 0 ? 0 : df / Math.abs(df),
          dr === 0 ? 0 : dr / Math.abs(dr));
      return false;
    default:
      return false;
  }
}

function isRayBlocked(
  chess: Chess,
  fA: number, rA: number,
  fT: number, rT: number,
  dFile: number, dRank: number
): boolean {
  let f = fA + dFile;
  let r = rA + dRank;
  while (f !== fT || r !== rT) {
    if (chess.get(`${String.fromCharCode(97 + f)}${r + 1}` as Square)) return true;
    f += dFile;
    r += dRank;
  }
  return false;
}

/**
 * Detects if a move creates a pin: an opponent piece is pinned to a more valuable piece behind it.
 * A pin is when our sliding piece (bishop, rook, queen) attacks an opponent piece
 * that has a more valuable opponent piece behind it on the same line.
 */
export function detectPin(chess: Chess, move: Move): PinResult {
  const movedPiece = chess.get(move.to as Square);
  if (!movedPiece) return { isPin: false, pinnedSquare: null, pinnerSquare: null, valuablePieceSquare: null };

  const attackerColor: Color = move.color;
  const opponentColor: Color = attackerColor === 'w' ? 'b' : 'w';
  const pieceType = movedPiece.type;

  // Only sliding pieces can create pins
  if (!['b', 'r', 'q'].includes(pieceType)) {
    return { isPin: false, pinnedSquare: null, pinnerSquare: null, valuablePieceSquare: null };
  }

  const attackerSquare = move.to as Square;
  const directions = getSlidingDirections(pieceType);

  for (const [dFile, dRank] of directions) {
    const pinResult = checkPinInDirection(chess, attackerSquare, dFile, dRank, attackerColor, opponentColor);
    if (pinResult.isPin) return pinResult;
  }

  return { isPin: false, pinnedSquare: null, pinnerSquare: null, valuablePieceSquare: null };
}

function getSlidingDirections(piece: PieceSymbol): [number, number][] {
  if (piece === 'b') return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  if (piece === 'r') return [[-1, 0], [1, 0], [0, -1], [0, 1]];
  // Queen
  return [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];
}

function checkPinInDirection(
  chess: Chess,
  from: Square,
  dFile: number,
  dRank: number,
  attackerColor: Color,
  opponentColor: Color
): PinResult {
  const fromFile = from.charCodeAt(0) - 97;
  const fromRank = parseInt(from[1]) - 1;

  let f = fromFile + dFile;
  let r = fromRank + dRank;
  let firstOpponentSquare: Square | null = null;
  let firstOpponentPiece: PieceSymbol | null = null;

  while (f >= 0 && f < 8 && r >= 0 && r < 8) {
    const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
    const cell = chess.get(sq);

    if (cell) {
      if (cell.color === attackerColor) break; // blocked by own piece

      if (cell.color === opponentColor) {
        if (firstOpponentSquare === null) {
          // First opponent piece in the ray
          firstOpponentSquare = sq;
          firstOpponentPiece = cell.type;
        } else {
          // Second opponent piece — check if it's more valuable than the first
          if (
            firstOpponentPiece &&
            PIECE_VALUES[cell.type] > PIECE_VALUES[firstOpponentPiece]
          ) {
            return {
              isPin: true,
              pinnedSquare: firstOpponentSquare,
              pinnerSquare: from,
              valuablePieceSquare: sq,
            };
          }
          break;
        }
      }
    }

    f += dFile;
    r += dRank;
  }

  return { isPin: false, pinnedSquare: null, pinnerSquare: null, valuablePieceSquare: null };
}

/**
 * Detects if the rook (at move.to) is on an open or semi-open file.
 * Open file: no pawns of either color.
 * Semi-open: no friendly pawns, but opponent pawn present.
 */
export function detectOpenFile(chess: Chess, move: Move): OpenFileResult {
  const movedPiece = chess.get(move.to as Square);
  if (!movedPiece || movedPiece.type !== 'r') {
    return { isOpen: false, isSemiOpen: false, file: move.to[0] };
  }

  const file = move.to[0];
  const playerColor: Color = move.color;
  const board = chess.board();
  const fileIndex = file.charCodeAt(0) - 97;

  let hasFriendlyPawn = false;
  let hasOpponentPawn = false;

  for (let rank = 0; rank < 8; rank++) {
    const cell = board[rank][fileIndex];
    if (cell && cell.type === 'p') {
      if (cell.color === playerColor) hasFriendlyPawn = true;
      else hasOpponentPawn = true;
    }
  }

  const isOpen = !hasFriendlyPawn && !hasOpponentPawn;
  const isSemiOpen = !hasFriendlyPawn && hasOpponentPawn;

  return { isOpen, isSemiOpen, file };
}

/**
 * Returns the squares a piece on `square` can reach (for fork checking).
 */
export function getAttackedSquares(chess: Chess, square: Square): Square[] {
  const moves = chess.moves({ square, verbose: true });
  return moves.map(m => m.to as Square);
}

/**
 * Returns true if the move is a pawn promotion.
 */
export function isPromotion(move: Move): boolean {
  return move.flags.includes('p');
}

/**
 * Returns true if the move is castling (kingside or queenside).
 */
export function isCastling(move: Move): boolean {
  return move.flags.includes('k') || move.flags.includes('q');
}

/**
 * Returns true if the move is en passant.
 */
export function isEnPassant(move: Move): boolean {
  return move.flags.includes('e');
}

/**
 * Returns true if the destination square is a center square (e4, d4, e5, d5).
 */
export function isCenterSquare(square: Square): boolean {
  return ['e4', 'd4', 'e5', 'd5'].includes(square);
}

/**
 * Counts how many squares a bishop on `square` controls (can see).
 * Uses manual diagonal tracing — works regardless of whose turn it is.
 */
export function countBishopControlledSquares(chess: Chess, square: Square): number {
  const piece = chess.get(square);
  if (!piece || piece.type !== 'b') return 0;

  const fS = square.charCodeAt(0) - 97;
  const rS = parseInt(square[1]) - 1;
  let count = 0;

  for (const [dFile, dRank] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as [number, number][]) {
    let f = fS + dFile;
    let r = rS + dRank;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      count++;
      if (chess.get(`${String.fromCharCode(97 + f)}${r + 1}` as Square)) break;
      f += dFile;
      r += dRank;
    }
  }
  return count;
}
