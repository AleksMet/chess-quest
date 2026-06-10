import type { Chess, Move, PieceSymbol, Square } from 'chess.js';

// Типы улучшений ИИ режима ХАОС — симметричны улучшениям игрока (см. GDD §6 «Улучшения AI»)
export type AIUpgradeType = 'berserk' | 'sniper' | 'guard';

export interface AIUpgrade {
  pieceType: PieceSymbol; // какая фигура ИИ имеет улучшение
  upgradeType: AIUpgradeType;
}

// Ценность фигур для улучшения «Снайпер»
const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Главная функция — применяет улучшения ИИ к ходу Stockfish.
// Возвращает либо ход, форсированный улучшением, либо исходный ход Stockfish (lan-формат, "e2e4").
export function applyAIUpgrades(chess: Chess, stockfishMove: string, aiUpgrades: AIUpgrade[]): string {
  const move = chess.moves({ verbose: true }).find(m => m.lan === stockfishMove || m.san === stockfishMove);
  if (!move) return stockfishMove;

  const upgrade = aiUpgrades.find(u => u.pieceType === move.piece);
  if (!upgrade) return stockfishMove;

  switch (upgrade.upgradeType) {
    case 'berserk': return applyBerserk(chess, move, stockfishMove);
    case 'sniper': return applySniper(chess, move, stockfishMove);
    case 'guard': return applyGuard(chess, move, stockfishMove);
    default: return stockfishMove;
  }
}

// Берсерк: всегда берёт если может
function applyBerserk(chess: Chess, move: Move, fallback: string): string {
  const captures = chess.moves({ verbose: true }).filter(m => m.piece === move.piece && m.color === 'b' && m.captured);
  if (captures.length > 0) return captures[0].lan;
  return fallback;
}

// Снайпер: берёт фигуру игрока если она дороже снайпера
function applySniper(chess: Chess, move: Move, fallback: string): string {
  const captures = chess.moves({ verbose: true }).filter(m =>
    m.piece === move.piece &&
    m.color === 'b' &&
    m.captured &&
    PIECE_VALUES[m.captured] > PIECE_VALUES[m.piece]
  );
  if (captures.length > 0) return captures[0].lan;
  return fallback;
}

// Страж: телохранитель короля
function applyGuard(chess: Chess, move: Move, fallback: string): string {
  const kingSquare = findKingSquare(chess, 'b');
  if (!kingSquare) return fallback;

  // Приоритет 1: король под шахом И атакующая фигура игрока не защищена И Страж может её взять → берёт
  if (chess.inCheck()) {
    const attackers = getAttackersOfKing(chess, 'b');
    for (const attacker of attackers) {
      if (!isSquareDefended(chess, attacker, 'w')) {
        const capture = chess.moves({ verbose: true })
          .find(m => m.piece === move.piece && m.color === 'b' && m.to === attacker);
        if (capture) return capture.lan;
      }
    }
  }

  // Приоритет 3: держаться в радиусе 2 клеток от короля
  const guardMoves = chess.moves({ verbose: true })
    .filter(m => m.piece === move.piece && m.color === 'b')
    .filter(m => chebyshevDistance(m.to, kingSquare) <= 2);

  if (guardMoves.length > 0) {
    return guardMoves.sort((a, b) =>
      chebyshevDistance(a.to, kingSquare) - chebyshevDistance(b.to, kingSquare)
    )[0].lan;
  }

  return fallback;
}

// Вспомогательные функции

function findKingSquare(chess: Chess, color: 'w' | 'b'): Square | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

function chebyshevDistance(sq1: Square, sq2: Square): number {
  const fileDiff = Math.abs(sq1.charCodeAt(0) - sq2.charCodeAt(0));
  const rankDiff = Math.abs(parseInt(sq1[1], 10) - parseInt(sq2[1], 10));
  return Math.max(fileDiff, rankDiff);
}

// Клетки фигур противоположного цвета, атакующих короля цвета `color`
function getAttackersOfKing(chess: Chess, color: 'w' | 'b'): Square[] {
  const kingSquare = findKingSquare(chess, color);
  if (!kingSquare) return [];
  return chess.attackers(kingSquare, color === 'w' ? 'b' : 'w');
}

// Защищена ли клетка фигурами цвета `byColor`
function isSquareDefended(chess: Chess, square: Square, byColor: 'w' | 'b'): boolean {
  return chess.attackers(square, byColor).length > 0;
}
