import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';

// Клетки флага только на стороне противника (ряды 5-7 для белых)
export const FLAG_SQUARES: Square[] = ['e5', 'd5', 'e6', 'd6', 'c5', 'f5'];
export const FLAG_HOLD_REQUIRED = 5;

// Выбирает клетку флага — предпочтительно свободную в стартовой позиции
export function selectFlagSquare(startFen?: string): Square {
  if (startFen) {
    try {
      const chess = new Chess(startFen);
      const free = FLAG_SQUARES.filter(sq => !chess.get(sq));
      if (free.length > 0) {
        return free[Math.floor(Math.random() * free.length)];
      }
    } catch {
      // Если FEN невалиден — используем случайную
    }
  }
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
// AI всегда стремится захватить/удержать флаг — Stockfish используется только как fallback
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
    const playerOnFlag = flagPiece !== null && flagPiece !== undefined && flagPiece.color === 'w';
    const aiOnFlag = flagPiece !== null && flagPiece !== undefined && flagPiece.color === 'b';

    // Случай 1: игрок на флаге — AI обязан атаковать
    if (playerOnFlag) {
      // Приоритет: взять фигуру прямо на флаге
      const capture = legalMoves.find(m => m.to === flagSquare && m.captured);
      if (capture) return `${capture.from}${capture.to}${capture.promotion ?? ''}`;

      // Нет возможности взять — двигаем ближайшую фигуру к флагу
      const approach = findMoveTowardFlag(flagSquare, legalMoves);
      if (approach) return approach;

      // Никаких вариантов — только тогда Stockfish
      return stockfishMove;
    }

    // Случай 2: AI стоит на флаге — не уходим кроме шаха
    if (aiOnFlag) {
      const kingInCheck = chess.isCheck();
      if (!kingInCheck) {
        // Флаг не под шахом — пытаемся остаться на нём
        const stockFrom = stockfishMove.slice(0, 2);
        if (stockFrom !== flagSquare) return stockfishMove; // Stockfish и так не уходит

        // Stockfish хочет уйти с флага — ищем другой ход
        const stayMoves = legalMoves.filter(m => m.from !== flagSquare);
        if (stayMoves.length > 0) {
          // Выбираем ход который не открывает флаг под атаку игрока
          for (const m of stayMoves) {
            const cloned = new Chess(chess.fen());
            cloned.move({ from: m.from, to: m.to, promotion: (m.promotion as 'q') ?? undefined });
            // После хода наш флаг всё ещё под контролем AI
            const piece = cloned.get(flagSquare);
            if (piece && piece.color === 'b') {
              return `${m.from}${m.to}${m.promotion ?? ''}`;
            }
          }
          // Нет идеального хода — хотя бы не уходим с флага
          const m = stayMoves[0];
          return `${m.from}${m.to}${m.promotion ?? ''}`;
        }
      }
      return stockfishMove;
    }

    // Случай 3: флаг свободен — AI ВСЕГДА пытается занять
    const flagMove = findMoveTowardFlag(flagSquare, legalMoves);
    if (flagMove) return flagMove;

    // Если не удалось найти ход к флагу — Stockfish
    return stockfishMove;
  } catch {
    return stockfishMove;
  }
}

// Находит лучший ход AI по направлению к флагу
// Прямой ход на флаг имеет абсолютный приоритет
function findMoveTowardFlag(
  flagSquare: Square,
  legalMoves: ReturnType<Chess['moves']>,
): string | null {
  type VerboseMove = { from: string; to: string; promotion?: string };
  const moves = legalMoves as VerboseMove[];

  // Прямой захват флага
  const direct = moves.find(m => m.to === flagSquare);
  if (direct) return `${direct.from}${direct.to}${direct.promotion ?? ''}`;

  // Минимальное чебышёвское расстояние к флагу
  const flagFile = flagSquare.charCodeAt(0) - 97;
  const flagRank = parseInt(flagSquare[1]) - 1;

  let bestDist = Infinity;
  let bestUci: string | null = null;

  for (const m of moves) {
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
