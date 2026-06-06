import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

interface TargetConfig {
  types: string[];
  moveLimit: number;
}

const FLOOR_CONFIGS: TargetConfig[] = [
  { types: ['p'],        moveLimit: 20 }, // этаж 0 — цель: пешка
  { types: ['p', 'n'],   moveLimit: 18 }, // этаж 1
  { types: ['n', 'b'],   moveLimit: 15 }, // этаж 2
  { types: ['r', 'n'],   moveLimit: 15 }, // этаж 3
  { types: ['r', 'q'],   moveLimit: 12 }, // этаж 4
];

function configForFloor(floorIndex: number): TargetConfig {
  return FLOOR_CONFIGS[Math.min(floorIndex, FLOOR_CONFIGS.length - 1)];
}

export function selectSniperTarget(fen: string, floorIndex: number): Square | null {
  try {
    const chess = new Chess(fen);
    const { types } = configForFloor(floorIndex);
    const board = chess.board();

    const candidates: Square[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (piece && piece.color === 'b' && types.includes(piece.type)) {
          const file = String.fromCharCode('a'.charCodeAt(0) + f);
          const rank = String(8 - r);
          candidates.push(`${file}${rank}` as Square);
        }
      }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch {
    return null;
  }
}

export function getSniperMoveLimit(floorIndex: number): number {
  return configForFloor(floorIndex).moveLimit;
}

// Возвращает защитный ход AI если цель под угрозой, иначе — ход Stockfish
export function getProtectiveMove(
  chess: Chess,
  targetSquare: Square,
  stockfishMove: string,
): string {
  try {
    // Проверяем атакована ли цель белыми
    const isTargetUnderAttack = chess.isAttacked(targetSquare, 'w');
    if (!isTargetUnderAttack) return stockfishMove;

    const legalMoves = chess.moves({ verbose: true });

    // Приоритет 1: увести целевую фигуру на безопасную клетку
    const escapeMoves = legalMoves.filter(m => m.from === targetSquare);
    for (const m of escapeMoves) {
      const uci = `${m.from}${m.to}${m.promotion ?? ''}`;
      // Проверяем, что после хода цель не останется под атакой
      const cloned = new Chess(chess.fen());
      cloned.move({ from: m.from, to: m.to, promotion: (m.promotion as 'q') ?? undefined });
      if (!cloned.isAttacked(m.to as Square, 'w')) {
        return uci;
      }
    }

    // Приоритет 2: взять атакующую фигуру
    // Находим белые фигуры которые атакуют цель
    const attackers = findAttackers(chess, targetSquare, 'w');
    for (const attackerSq of attackers) {
      const captureMoves = legalMoves.filter(m => m.to === attackerSq);
      if (captureMoves.length > 0) {
        const m = captureMoves[0];
        return `${m.from}${m.to}${m.promotion ?? ''}`;
      }
    }

    // Приоритет 3: поставить защитника между атакующим и целью (только для дальнобойных)
    for (const attackerSq of attackers) {
      const blockers = findBlockingSquares(chess, attackerSq, targetSquare);
      for (const blockSq of blockers) {
        const blockMoves = legalMoves.filter(m => m.to === blockSq && m.from !== targetSquare);
        if (blockMoves.length > 0) {
          const m = blockMoves[0];
          return `${m.from}${m.to}${m.promotion ?? ''}`;
        }
      }
    }

    // Fallback: ход Stockfish
    return stockfishMove;
  } catch {
    return stockfishMove;
  }
}

// Находит клетки фигур заданного цвета, атакующих targetSquare
function findAttackers(chess: Chess, targetSquare: Square, attackerColor: 'w' | 'b'): Square[] {
  const board = chess.board();
  const attackers: Square[] = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece || piece.color !== attackerColor) continue;
      const sq = `${String.fromCharCode('a'.charCodeAt(0) + f)}${8 - r}` as Square;
      if (chess.isAttacked(targetSquare, attackerColor)) {
        // Геометрически проверяем, что именно эта фигура атакует цель
        const pieceInfo = chess.get(sq);
        if (pieceInfo && canAttackSquare(pieceInfo.type, sq, targetSquare, chess)) {
          attackers.push(sq);
        }
      }
    }
  }

  return attackers;
}

// Геометрическая проверка: может ли фигура на from атаковать to
function canAttackSquare(
  pieceType: string,
  from: Square,
  to: Square,
  chess: Chess,
): boolean {
  const fA = from.charCodeAt(0) - 97;
  const rA = parseInt(from[1]) - 1;
  const fT = to.charCodeAt(0) - 97;
  const rT = parseInt(to[1]) - 1;
  const df = fT - fA;
  const dr = rT - rA;

  switch (pieceType) {
    case 'n':
      return (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1);
    case 'p':
      // Чёрные пешки атакуют вниз (dr = -1)
      return dr === -1 && Math.abs(df) === 1;
    case 'k':
      return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0);
    case 'b':
      if (Math.abs(df) !== Math.abs(dr) || df === 0) return false;
      return !isPathBlocked(chess, fA, rA, fT, rT, df / Math.abs(df), dr / Math.abs(dr));
    case 'r':
      if (df !== 0 && dr !== 0) return false;
      return !isPathBlocked(chess, fA, rA, fT, rT,
        df === 0 ? 0 : df / Math.abs(df),
        dr === 0 ? 0 : dr / Math.abs(dr));
    case 'q': {
      const isDiag = Math.abs(df) === Math.abs(dr) && df !== 0;
      const isStraight = df === 0 || dr === 0;
      if (!isDiag && !isStraight) return false;
      return !isPathBlocked(chess, fA, rA, fT, rT,
        df === 0 ? 0 : df / Math.abs(df),
        dr === 0 ? 0 : dr / Math.abs(dr));
    }
    default:
      return false;
  }
}

function isPathBlocked(
  chess: Chess,
  fA: number, rA: number,
  fT: number, rT: number,
  dFile: number, dRank: number,
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

// Возвращает клетки между атакующим и целью (для блокировки дальнобойных)
function findBlockingSquares(chess: Chess, attackerSq: Square, targetSq: Square): Square[] {
  const piece = chess.get(attackerSq);
  if (!piece || !['b', 'r', 'q'].includes(piece.type)) return [];

  const fA = attackerSq.charCodeAt(0) - 97;
  const rA = parseInt(attackerSq[1]) - 1;
  const fT = targetSq.charCodeAt(0) - 97;
  const rT = parseInt(targetSq[1]) - 1;
  const df = fT - fA;
  const dr = rT - rA;

  const isDiag = Math.abs(df) === Math.abs(dr) && df !== 0;
  const isStraight = df === 0 || dr === 0;
  if (!isDiag && !isStraight) return [];

  const stepF = df === 0 ? 0 : df / Math.abs(df);
  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const squares: Square[] = [];

  let f = fA + stepF;
  let r = rA + stepR;
  while (f !== fT || r !== rT) {
    squares.push(`${String.fromCharCode(97 + f)}${r + 1}` as Square);
    f += stepF;
    r += stepR;
  }

  return squares;
}
