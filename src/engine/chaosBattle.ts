import { Chess } from 'chess.js';
import type { PieceSymbol, Square } from 'chess.js';
import type { ChessPiece } from '../store/chaosModeStore';
import type { AIUpgrade } from './chaosAIUpgrades';
import type { BattleType } from '../types/mechanics';
import { sanitizeFen } from './fenUtils';

// Режим «ХАОС»: бои собранной игроком армией против фиксированных составов ИИ
export type ChaosBattleNumber = 1 | 2 | 'boss';

export const CHAOS_BATTLE_ELO: Record<ChaosBattleNumber, number> = {
  1: 800,
  2: 1000,
  boss: 1400,
};

export const CHAOS_GOLD = {
  mateUnder10: 150,
  mate11to20: 100,
  draw: 0,
  capturePawn: 10,
  captureMinor: 30, // конь или слон
  captureRook: 50,
  captureQueen: 90,
};

// Бонусы артефактов сокровища
export const CHAOS_FORK_BONUS = 30;     // «Вилка Каспарова» — за каждую вилку конём
export const CHAOS_TREASURY_GOLD = 80;  // «Казна» — моментальный бонус
export const CHAOS_BLITZ_MOVE_LIMIT = 5; // «Блиц-мастер» — победа за столько ходов или меньше даёт ×2 золота

const FALLBACK_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

type Board = (string | null)[][];

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

// row 0 = 8-я горизонталь ... row 7 = 1-я горизонталь
function place(board: Board, square: string, piece: string): void {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  board[8 - rank][file] = piece;
}

function boardToFenRows(board: Board): string {
  return board.map(row => {
    let s = '';
    let empty = 0;
    for (const cell of row) {
      if (cell === null) { empty += 1; continue; }
      if (empty > 0) { s += empty; empty = 0; }
      s += cell;
    }
    if (empty > 0) s += empty;
    return s;
  }).join('/');
}

function countPieces(pieces: ChessPiece[]): Record<PieceSymbol, number> {
  const counts: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const piece of pieces) counts[piece] += 1;
  return counts;
}

// Стартовые клетки армии игрока (белые) — общие константы для расстановки и для
// отслеживания позиций улучшенных фигур (см. pieceStartingSquare)
const ROOK_SQUARES: Square[] = ['a1', 'h1'];
const BISHOP_SQUARES: Square[] = ['c1', 'f1'];
const KNIGHT_SQUARES: Square[] = ['b1', 'g1'];

// Расставляет армию игрока (белые) на стандартные клетки:
// Король → e1, Ферзь → d1, Ладьи → a1/h1, Слоны → c1/f1, Кони → b1/g1,
// Пешки → a2, b2, c2... слева направо
function buildPlayerBoard(pieces: ChessPiece[]): Board {
  const board = emptyBoard();
  const counts = countPieces(pieces);

  place(board, 'e1', 'K');
  if (counts.q > 0) place(board, 'd1', 'Q');

  for (let i = 0; i < Math.min(counts.r, ROOK_SQUARES.length); i++) place(board, ROOK_SQUARES[i], 'R');
  for (let i = 0; i < Math.min(counts.b, BISHOP_SQUARES.length); i++) place(board, BISHOP_SQUARES[i], 'B');
  for (let i = 0; i < Math.min(counts.n, KNIGHT_SQUARES.length); i++) place(board, KNIGHT_SQUARES[i], 'N');
  for (let i = 0; i < Math.min(counts.p, 8); i++) place(board, `${FILES[i]}2`, 'P');

  return board;
}

// Стартовая клетка конкретного экземпляра фигуры в армии игрока — мирроит расстановку
// buildPlayerBoard, чтобы отслеживать положение улучшенных фигур на доске (chaos-battle)
export function pieceStartingSquare(pieceType: PieceSymbol, pieceIndex: number): Square | null {
  switch (pieceType) {
    case 'k': return pieceIndex === 0 ? 'e1' : null;
    case 'q': return pieceIndex === 0 ? 'd1' : null;
    case 'r': return ROOK_SQUARES[pieceIndex] ?? null;
    case 'b': return BISHOP_SQUARES[pieceIndex] ?? null;
    case 'n': return KNIGHT_SQUARES[pieceIndex] ?? null;
    case 'p': return pieceIndex < 8 ? (`${FILES[pieceIndex]}2` as Square) : null;
    default: return null;
  }
}

// Составы ИИ по номеру боя — фиксированные клетки, как в GDD раздел 22
function buildAiBoard(battleNumber: ChaosBattleNumber): Board {
  const board = emptyBoard();
  const sixPawnFiles = ['a', 'b', 'c', 'd', 'e', 'f'];

  switch (battleNumber) {
    case 1:
      place(board, 'e8', 'k');
      sixPawnFiles.forEach(f => place(board, `${f}7`, 'p'));
      // Конь на g8, а не b8 — иначе открытая линия «h» ведёт прямо на пустое h8,
      // и Ладья игрока даёт мат в 1 ход (Rh8#); конь на g8 закрывает 8-ю горизонталь.
      place(board, 'g8', 'n');
      place(board, 'c8', 'b');
      place(board, 'a8', 'r');
      break;
    case 2:
      place(board, 'e8', 'k');
      sixPawnFiles.forEach(f => place(board, `${f}7`, 'p'));
      place(board, 'd8', 'q');
      place(board, 'b8', 'n');
      place(board, 'g8', 'n');
      place(board, 'c8', 'b');
      place(board, 'a8', 'r');
      break;
    case 'boss':
      // Полная задняя линия + d6 ферзь как дополнительная угроза «Всадника»
      place(board, 'a8', 'r');
      place(board, 'b8', 'n');
      place(board, 'c8', 'b');
      place(board, 'd8', 'q');
      place(board, 'e8', 'k');
      place(board, 'f8', 'b');
      place(board, 'g8', 'n');
      place(board, 'h8', 'r');
      FILES.forEach(f => place(board, `${f}7`, 'p'));
      place(board, 'd6', 'q');
      break;
  }

  return board;
}

function mergeBoards(white: Board, black: Board): Board {
  const merged = emptyBoard();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      merged[r][c] = white[r][c] ?? black[r][c];
    }
  }
  return merged;
}

// Объединяет армию игрока и состав ИИ в одну позицию, ход белых.
// Невалидный результат (что в теории невозможно при штатной расстановке) → fallback на стандартную позицию
export function buildChaosFen(playerPieces: ChessPiece[], battleNumber: ChaosBattleNumber): string {
  const merged = mergeBoards(buildPlayerBoard(playerPieces), buildAiBoard(battleNumber));
  const fen = `${boardToFenRows(merged)} w - - 0 1`;

  try {
    new Chess(fen);
    return fen;
  } catch {
    return FALLBACK_FEN;
  }
}

// Клетки чёрной задней линии по типу фигуры — для расстановки состава ИИ уровня 2+ по улучшениям
const LEVEL2_BACK_RANK_POOL: Partial<Record<PieceSymbol, Square[]>> = {
  r: ['a8', 'h8'],
  b: ['c8', 'f8'],
  n: ['b8', 'g8'],
  q: ['d8'],
};

// Собирает позицию для боёв уровня 2+: армия игрока (белые) против состава ИИ —
// король e8 + 6 пешек a7-f7 + по фигуре на каждое улучшение из aiUpgrades (расставляются
// на задней линии по типу фигуры, см. LEVEL2_BACK_RANK_POOL)
export function buildLevel2AiFen(playerPieces: ChessPiece[], aiUpgrades: AIUpgrade[], extraPawns = false, ensureQueen = false): string {
  const aiBoard = emptyBoard();
  place(aiBoard, 'e8', 'k');
  if (ensureQueen) place(aiBoard, 'd8', 'q');
  const pawnFiles = extraPawns
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['a', 'b', 'c', 'd', 'e', 'f'];
  pawnFiles.forEach(f => place(aiBoard, `${f}7`, 'p'));

  const used: Partial<Record<PieceSymbol, number>> = {};
  for (const upgrade of aiUpgrades) {
    const pool = LEVEL2_BACK_RANK_POOL[upgrade.pieceType];
    if (!pool) continue;
    const idx = used[upgrade.pieceType] ?? 0;
    const square = pool[idx];
    if (!square) continue;
    place(aiBoard, square, upgrade.pieceType);
    used[upgrade.pieceType] = idx + 1;
  }

  const merged = mergeBoards(buildPlayerBoard(playerPieces), aiBoard);
  const fen = `${boardToFenRows(merged)} w - - 0 1`;

  try {
    new Chess(fen);
    return fen;
  } catch {
    return FALLBACK_FEN;
  }
}

// Полный стандартный состав чёрных — задняя линия для финального боя уровня 2+
const STANDARD_BACK_RANK: [Square, PieceSymbol][] = [
  ['a8', 'r'], ['b8', 'n'], ['c8', 'b'], ['d8', 'q'], ['e8', 'k'], ['f8', 'b'], ['g8', 'n'], ['h8', 'r'],
];

// Уровень 2+, финальный бой: полный стандартный состав чёрных (8 пешек + вся задняя линия),
// а не урезанный состав обычных боёв (король + 6 пешек + только улучшённые фигуры).
// Улучшения ИИ (например, ферзь-страж на d8) накладываются на уже стоящие на месте фигуры.
export function buildLevel2BossAiFen(playerPieces: ChessPiece[]): string {
  const aiBoard = emptyBoard();
  for (const [square, type] of STANDARD_BACK_RANK) place(aiBoard, square, type);
  FILES.forEach(f => place(aiBoard, `${f}7`, 'p'));

  const merged = mergeBoards(buildPlayerBoard(playerPieces), aiBoard);
  const fen = `${boardToFenRows(merged)} w - - 0 1`;

  try {
    new Chess(fen);
    return fen;
  } catch {
    return FALLBACK_FEN;
  }
}

// Состав ИИ для боёв Act 2+ без кастомных AI-улучшений (mechanics-v3):
// - standard:              полная задняя линия + 6 пешек (a-f7)
// - objective_queen_hunt:  К+Ф+2Л+1С+2К + 5 пешек (a-e7)
// - objective_pawn_march / objective_royal_shield: полный состав + 8 пешек
// - elite:                 полный состав + 6 пешек (элита — через buildLevel2BossAiFen у босса)
export function buildLevel2StandardAiFen(
  playerPieces: ChessPiece[],
  battleType: BattleType,
): string {
  const aiBoard = emptyBoard();

  if (battleType === 'objective_queen_hunt') {
    // Ферзь есть (цель для охоты), один слон убран, 5 пешек
    place(aiBoard, 'a8', 'r');
    place(aiBoard, 'b8', 'n');
    place(aiBoard, 'c8', 'b');
    place(aiBoard, 'd8', 'q');
    place(aiBoard, 'e8', 'k');
    place(aiBoard, 'f8', 'n');
    place(aiBoard, 'g8', 'r');
    ['a', 'b', 'c', 'd', 'e'].forEach(f => place(aiBoard, `${f}7`, 'p'));
  } else if (battleType === 'objective_pawn_march' || battleType === 'objective_royal_shield') {
    // Полный состав + 8 пешек — максимальное давление на объективные бои
    for (const [sq, tp] of STANDARD_BACK_RANK) place(aiBoard, sq, tp);
    FILES.forEach(f => place(aiBoard, `${f}7`, 'p'));
  } else {
    // standard / elite: полная задняя линия + 6 пешек
    for (const [sq, tp] of STANDARD_BACK_RANK) place(aiBoard, sq, tp);
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach(f => place(aiBoard, `${f}7`, 'p'));
  }

  const merged = mergeBoards(buildPlayerBoard(playerPieces), aiBoard);
  const fen = `${boardToFenRows(merged)} w - - 0 1`;
  try {
    new Chess(fen);
    return fen;
  } catch {
    return FALLBACK_FEN;
  }
}

// Убирает пешки с 1-й и 8-й горизонталей перед передачей FEN в chess.js —
// обходит "Invalid FEN: some pawns are on the edge rows".

// Собирает армию игрока для следующего боя из итоговой позиции (Вариант В превращения):
// ферзь, выросший из пешки во время боя, возвращается пешкой; купленный ферзь остаётся ферзём.
// Различить их можно только по числу — лишние ферзи сверх купленных это превращённые пешки.
export function resolveArmyAfterBattle(boardFen: string, purchasedPieces: ChessPiece[]): ChessPiece[] {
  const chess = new Chess(sanitizeFen(boardFen));
  const purchasedQueens = purchasedPieces.filter(p => p === 'q').length;

  let queensSeen = 0;
  const survivors: ChessPiece[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== 'w') continue;
      if (cell.type === 'q') {
        queensSeen += 1;
        survivors.push(queensSeen > purchasedQueens ? 'p' : 'q');
      } else {
        survivors.push(cell.type);
      }
    }
  }
  return survivors;
}

// ===== ИИ босса «Всадник» — особые механики фигур (см. GDD раздел 22) =====

export interface BossMoveCandidate {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function findPieceSquare(chess: Chess, type: PieceSymbol, color: 'w' | 'b'): Square | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === type && cell.color === color) return cell.square;
    }
  }
  return null;
}

export function findAllPieceSquares(chess: Chess, type: PieceSymbol, color: 'w' | 'b'): Square[] {
  const squares: Square[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === type && cell.color === color) squares.push(cell.square);
    }
  }
  return squares;
}

// Расстояние Чебышёва между клетками — «в скольких ходах короля» одна клетка от другой
function squareDistance(a: Square, b: Square): number {
  const fileDiff = Math.abs(a.charCodeAt(0) - b.charCodeAt(0));
  const rankDiff = Math.abs(parseInt(a[1], 10) - parseInt(b[1], 10));
  return Math.max(fileDiff, rankDiff);
}

// Ферзь-Берсерк: если у чёрных есть взятие ферзём — форсируем его (даже если Stockfish
// выбрал другой ход), отдавая предпочтение более ценной добыче. Если Stockfish и так
// выбрал взятие ферзём — оставляем его выбор как есть.
export function getBerserkQueenMove(chess: Chess, stockfishMove: BossMoveCandidate): BossMoveCandidate {
  const queenCaptures = chess.moves({ verbose: true }).filter(m => m.piece === 'q' && m.captured);
  if (queenCaptures.length === 0) return stockfishMove;

  const stockfishIsQueenCapture = queenCaptures.some(m => m.from === stockfishMove.from && m.to === stockfishMove.to);
  if (stockfishIsQueenCapture) return stockfishMove;

  const best = queenCaptures.reduce((a, b) => (PIECE_VALUES[b.captured as PieceSymbol] > PIECE_VALUES[a.captured as PieceSymbol] ? b : a));
  return { from: best.from as Square, to: best.to as Square, promotion: best.promotion as PieceSymbol | undefined };
}

// Ладья-Страж: чёрная ладья, стоящая ближе всех к своему королю, не уходит дальше
// 3 клеток от него. Если ход Stockfish уводит её дальше — ищем среди её ходов любой,
// что удерживает её в радиусе; не находим — оставляем выбор Stockfish.
export function getGuardRookMove(chess: Chess, stockfishMove: BossMoveCandidate): BossMoveCandidate {
  const kingSquare = findPieceSquare(chess, 'k', 'b');
  if (!kingSquare) return stockfishMove;

  const rookSquares = findAllPieceSquares(chess, 'r', 'b');
  if (rookSquares.length === 0) return stockfishMove;
  const guardRook = rookSquares.reduce((a, b) => (squareDistance(b, kingSquare) < squareDistance(a, kingSquare) ? b : a));

  if (stockfishMove.from !== guardRook || squareDistance(stockfishMove.to, kingSquare) <= 3) {
    return stockfishMove;
  }

  const rookMoves = chess.moves({ square: guardRook, verbose: true });
  const safeMove = rookMoves.find(m => squareDistance(m.to as Square, kingSquare) <= 3);
  return safeMove
    ? { from: safeMove.from as Square, to: safeMove.to as Square, promotion: safeMove.promotion as PieceSymbol | undefined }
    : stockfishMove;
}

const SPAWN_RANKS = [5, 6, 7, 8];

// Король-Всадник: после каждого хода своим королём ставит чёрного коня на случайную
// свободную клетку рядов 5-8 (см. GDD раздел 22). Возвращает клетку спавна или null,
// если ход не королём либо свободных клеток в этой зоне не осталось.
export function spawnKnightOnKingMove(chess: Chess, move: { piece: PieceSymbol; color: 'w' | 'b' }): Square | null {
  if (move.piece !== 'k' || move.color !== 'b') return null;

  const emptySquares: Square[] = [];
  for (const rank of SPAWN_RANKS) {
    for (const file of FILES) {
      const square = `${file}${rank}` as Square;
      if (!chess.get(square)) emptySquares.push(square);
    }
  }
  if (emptySquares.length === 0) return null;

  const square = emptySquares[Math.floor(Math.random() * emptySquares.length)];
  chess.put({ type: 'n', color: 'b' }, square);
  return square;
}
