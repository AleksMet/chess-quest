import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';

export const FLAG_SQUARES: Square[] = ['e4', 'd4', 'e5', 'd5'];
export const FLAG_HOLD_REQUIRED = 5; // было 3, теперь 5

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

// Возвращает флаг-осознанный ход AI поверх Stockfish
export function getFlagAwareMove(
  chess: Chess,
  flagSquare: Square,
  _playerHoldCount: number,
  _aiHoldCount: number,
  stockfishMove: string,
): string {
  try {
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return stockfishMove;

    const flagPiece = chess.get(flagSquare);
    const playerOnFlag = flagPiece && flagPiece.color === 'w';
    const aiOnFlag = flagPiece && flagPiece.color === 'b';

    // Случай 1: игрок стоит на флаге — AI атакует фигуру на флаге
    if (playerOnFlag) {
      // Ищем ход AI который берёт фигуру на флаге
      const attackFlag = legalMoves.find(m => m.to === flagSquare && m.captured);
      if (attackFlag) {
        return `${attackFlag.from}${attackFlag.to}${attackFlag.promotion ?? ''}`;
      }
      // Или встаём на флаг (вытесняем)
      const moveToFlag = legalMoves.find(m => m.to === flagSquare);
      if (moveToFlag) {
        return `${moveToFlag.from}${moveToFlag.to}${moveToFlag.promotion ?? ''}`;
      }
    }

    // Случай 2: AI стоит на флаге — по возможности не уходим
    if (aiOnFlag) {
      // Проверяем, есть ли угроза фигуре на флаге
      const flagUnderAttack = chess.isAttacked(flagSquare, 'w');
      if (!flagUnderAttack) {
        // Флаг не атакован — оставляем Stockfish ход, но если он уводит с флага — ищем другой
        const stockFrom = stockfishMove.slice(0, 2);
        if (stockFrom === flagSquare) {
          // Stockfish хочет уйти с флага — ищем другой ход
          const stayMoves = legalMoves.filter(m => m.from !== flagSquare);
          if (stayMoves.length > 0) {
            const m = stayMoves[Math.floor(Math.random() * stayMoves.length)];
            return `${m.from}${m.to}${m.promotion ?? ''}`;
          }
        }
        return stockfishMove;
      }
    }

    // Случай 3: флаг свободен — с вероятностью 60% двигаем к флагу
    if (!playerOnFlag && !aiOnFlag && Math.random() < 0.60) {
      const bestMove = findMoveTowardFlag(chess, flagSquare, legalMoves);
      if (bestMove) return bestMove;
    }

    return stockfishMove;
  } catch {
    return stockfishMove;
  }
}

// Находит ход AI, который ставит фигуру на флаг или ближе к нему
function findMoveTowardFlag(
  _chess: Chess,
  flagSquare: Square,
  legalMoves: ReturnType<Chess['moves']>,
): string | null {
  // Сначала: прямой ход на флаг
  const directToFlag = (legalMoves as Array<{ from: string; to: string; promotion?: string }>)
    .find(m => m.to === flagSquare);
  if (directToFlag) {
    return `${directToFlag.from}${directToFlag.to}${directToFlag.promotion ?? ''}`;
  }

  // Затем: ход который минимизирует чебышёвское расстояние до флага
  const flagFile = flagSquare.charCodeAt(0) - 97;
  const flagRank = parseInt(flagSquare[1]) - 1;

  let bestDist = Infinity;
  let bestUci: string | null = null;

  for (const m of legalMoves as Array<{ from: string; to: string; promotion?: string }>) {
    const toFile = m.to.charCodeAt(0) - 97;
    const toRank = parseInt(m.to[1]) - 1;
    const dist = Math.max(Math.abs(toFile - flagFile), Math.abs(toRank - flagRank));
    if (dist < bestDist) {
      bestDist = dist;
      bestUci = `${m.from}${m.to}${m.promotion ?? ''}`;
    }
  }

  return bestUci;
}
