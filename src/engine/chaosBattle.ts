import { Chess } from 'chess.js';
import type { PieceSymbol } from 'chess.js';
import type { ChessPiece } from '../store/chaosModeStore';

// Режим «ХАОС»: бои собранной игроком армией против фиксированных составов ИИ
export type ChaosBattleNumber = 1 | 2 | 3 | 'boss';

export const CHAOS_BATTLE_ELO: Record<ChaosBattleNumber, number> = {
  1: 800,
  2: 1000,
  3: 1100,
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

// Расставляет армию игрока (белые) на стандартные клетки:
// Король → e1, Ферзь → d1, Ладьи → a1/h1, Слоны → c1/f1, Кони → b1/g1,
// Пешки → a2, b2, c2... слева направо
function buildPlayerBoard(pieces: ChessPiece[]): Board {
  const board = emptyBoard();
  const counts = countPieces(pieces);

  place(board, 'e1', 'K');
  if (counts.q > 0) place(board, 'd1', 'Q');

  const rookSquares = ['a1', 'h1'];
  for (let i = 0; i < Math.min(counts.r, rookSquares.length); i++) place(board, rookSquares[i], 'R');

  const bishopSquares = ['c1', 'f1'];
  for (let i = 0; i < Math.min(counts.b, bishopSquares.length); i++) place(board, bishopSquares[i], 'B');

  const knightSquares = ['b1', 'g1'];
  for (let i = 0; i < Math.min(counts.n, knightSquares.length); i++) place(board, knightSquares[i], 'N');

  for (let i = 0; i < Math.min(counts.p, 8); i++) place(board, `${FILES[i]}2`, 'P');

  return board;
}

// Составы ИИ по номеру боя — фиксированные клетки, как в GDD раздел 22
function buildAiBoard(battleNumber: ChaosBattleNumber): Board {
  const board = emptyBoard();
  const sixPawnFiles = ['a', 'b', 'c', 'd', 'e', 'f'];

  switch (battleNumber) {
    case 1:
      place(board, 'e8', 'k');
      sixPawnFiles.forEach(f => place(board, `${f}7`, 'p'));
      place(board, 'b8', 'n');
      place(board, 'c8', 'b');
      place(board, 'a8', 'r');
      break;
    case 2:
      place(board, 'e8', 'k');
      sixPawnFiles.forEach(f => place(board, `${f}7`, 'p'));
      place(board, 'b8', 'n');
      place(board, 'g8', 'n');
      place(board, 'c8', 'b');
      place(board, 'a8', 'r');
      break;
    case 3:
      place(board, 'e8', 'k');
      sixPawnFiles.forEach(f => place(board, `${f}7`, 'p'));
      place(board, 'b8', 'n');
      place(board, 'g8', 'n');
      place(board, 'c8', 'b');
      place(board, 'f8', 'b');
      place(board, 'a8', 'r');
      break;
    case 'boss':
      place(board, 'e8', 'k');
      FILES.forEach(f => place(board, `${f}7`, 'p'));
      place(board, 'd8', 'q');
      place(board, 'd6', 'q');
      place(board, 'a8', 'r');
      place(board, 'h8', 'r');
      place(board, 'b8', 'n');
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

// Собирает армию игрока для следующего боя из итоговой позиции (Вариант В превращения):
// ферзь, выросший из пешки во время боя, возвращается пешкой; купленный ферзь остаётся ферзём.
// Различить их можно только по числу — лишние ферзи сверх купленных это превращённые пешки.
export function resolveArmyAfterBattle(boardFen: string, purchasedPieces: ChessPiece[]): ChessPiece[] {
  const chess = new Chess(boardFen);
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
