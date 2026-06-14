import { Chess } from 'chess.js';
import type { Move, PieceSymbol, Square } from 'chess.js';

// Типы улучшений ИИ режима ХАОС — симметричны улучшениям игрока (см. GDD §6 «Улучшения AI»)
export type AIUpgradeType = 'berserk' | 'sniper' | 'guard';

export interface AIUpgrade {
  pieceType: PieceSymbol; // какая фигура ИИ имеет улучшение
  upgradeType: AIUpgradeType;
}

// Телепортация атакующих фигур босса — раз в intervalMoves ходов фигуры типов
// targetPieces (кроме excludePieces) перемещаются на случайные свободные клетки рядов 5-8
export interface TeleportMechanic {
  intervalMoves: number;
  targetPieces: PieceSymbol[];
  excludePieces: PieceSymbol[];
}

// Ценность фигур для улучшения «Снайпер»
const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Главная функция — применяет улучшения ИИ к ходу Stockfish.
// Возвращает либо ход, форсированный улучшением, либо исходный ход Stockfish (lan-формат, "e2e4").
export function applyAIUpgrades(chess: Chess, stockfishMove: string, aiUpgrades: AIUpgrade[]): string {
  // Берсерк — приоритет выше хода Stockfish: проверяем ВСЕ берсерк-фигуры на доске,
  // независимо от того, какую фигуру выбрал Stockfish для хода
  const berserkMove = applyBerserk(chess, aiUpgrades);
  if (berserkMove) return berserkMove;

  const move = chess.moves({ verbose: true }).find(m => m.lan === stockfishMove || m.san === stockfishMove);
  if (!move) return stockfishMove;

  const upgrade = aiUpgrades.find(u => u.pieceType === move.piece);
  if (!upgrade) return stockfishMove;

  switch (upgrade.upgradeType) {
    case 'sniper': return applySniper(chess, move, stockfishMove);
    case 'guard': return applyGuard(chess, move, stockfishMove);
    default: return stockfishMove;
  }
}

// Берсерк: всегда берёт если может — проверяем все фигуры с улучшением berserk по их
// текущим позициям на доске; если несколько взятий доступны — выбираем случайное
function applyBerserk(chess: Chess, aiUpgrades: AIUpgrade[]): string | null {
  const berserkTypes = aiUpgrades.filter(u => u.upgradeType === 'berserk').map(u => u.pieceType);
  if (berserkTypes.length === 0) return null;

  const allCaptures: Move[] = [];
  for (const piece of getAllPieces(chess, 'b')) {
    if (!berserkTypes.includes(piece.type)) continue;
    const captures = chess.moves({ square: piece.square, verbose: true }).filter(m => m.captured);
    // eslint-disable-next-line no-console -- отладка форсированных взятий Берсерка
    console.log('[Berserk] checking square:', piece.square, 'captures:', captures);
    allCaptures.push(...captures);
  }

  if (allCaptures.length === 0) return null;
  return allCaptures[Math.floor(Math.random() * allCaptures.length)].lan;
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

// Цепочка эволюции фигур ИИ — пешка эволюционирует в коня или слона (случайно),
// конь и слон — в ладью, ладья — в ферзя; ферзь и король не эволюционируют
const EVOLUTION_CHAIN: Record<PieceSymbol, PieceSymbol[]> = {
  p: ['n', 'b'],
  n: ['r'],
  b: ['r'],
  r: ['q'],
  q: [],
  k: [],
};

// Эволюция фигуры ИИ — раз в evolutionMechanic.intervalMoves ходов (см. GDD «Двуглавый Рыцарь»).
// Выбирает случайную фигуру чёрных, способную эволюционировать, и заменяет её следующей
// по цепочке. При достижении лимита ферзей (maxQueens) исключает превращение в ферзя
// и при необходимости выбирает другую фигуру. Возвращает null, если эволюция невозможна.
export function evolvePiece(chess: Chess, maxQueens: number): Chess | null {
  const blackPieces = getAllPieces(chess, 'b');
  const evolvable = blackPieces.filter(p => EVOLUTION_CHAIN[p.type].length > 0);
  if (evolvable.length === 0) return null;

  let target = evolvable[Math.floor(Math.random() * evolvable.length)];
  let candidates = EVOLUTION_CHAIN[target.type];

  const currentQueens = blackPieces.filter(p => p.type === 'q').length;
  if (currentQueens >= maxQueens) {
    candidates = candidates.filter(c => c !== 'q');
    if (candidates.length === 0) {
      const otherEvolvable = evolvable.filter(p => EVOLUTION_CHAIN[p.type].some(c => c !== 'q'));
      if (otherEvolvable.length === 0) return null;
      target = otherEvolvable[Math.floor(Math.random() * otherEvolvable.length)];
      candidates = EVOLUTION_CHAIN[target.type].filter(c => c !== 'q');
    }
  }

  const newType = candidates[Math.floor(Math.random() * candidates.length)];

  const newChess = new Chess(chess.fen());
  newChess.remove(target.square);
  newChess.put({ type: newType, color: 'b' }, target.square);
  return newChess;
}

// Телепортация атакующих фигур босса (см. TeleportMechanic, GDD «Ведьма Диагоналей»):
// фигуры targetPieces (кроме excludePieces — обычно король и ферзь-страж) перемещаются
// на случайные свободные клетки рядов 5-8. Если свободных клеток не хватает — ничего не делает.
export function teleportAttackingPieces(
  chess: Chess,
  targetPieces: PieceSymbol[],
  excludePieces: PieceSymbol[]
): Chess {
  const piecesToTeleport = getAllPieces(chess, 'b')
    .filter(p => targetPieces.includes(p.type))
    .filter(p => !excludePieces.includes(p.type));

  if (piecesToTeleport.length === 0) return chess;

  const emptySquares = getEmptySquaresOnRanks(chess, [5, 6, 7, 8]);
  if (emptySquares.length < piecesToTeleport.length) return chess;

  const shuffled = [...emptySquares].sort(() => Math.random() - 0.5).slice(0, piecesToTeleport.length);

  const newChess = new Chess(chess.fen());
  piecesToTeleport.forEach((piece, index) => {
    newChess.remove(piece.square);
    newChess.put({ type: piece.type, color: 'b' }, shuffled[index]);
  });

  try {
    new Chess(newChess.fen());
    return newChess;
  } catch {
    return chess;
  }
}

// Пустые клетки на указанных горизонталях (1-8)
function getEmptySquaresOnRanks(chess: Chess, ranks: number[]): Square[] {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const squares: Square[] = [];
  for (const file of files) {
    for (const rank of ranks) {
      const square = `${file}${rank}` as Square;
      if (!chess.get(square)) squares.push(square);
    }
  }
  return squares;
}

// Все фигуры цвета `color` с их клетками
function getAllPieces(chess: Chess, color: 'w' | 'b'): { type: PieceSymbol; square: Square }[] {
  const pieces: { type: PieceSymbol; square: Square }[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.color === color) pieces.push({ type: cell.type, square: cell.square });
    }
  }
  return pieces;
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
