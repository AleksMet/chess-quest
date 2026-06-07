import type { Chess, Square } from 'chess.js';
import { countMaterial } from './positionGenerator';

// Режим «Форы»: у ИИ лишний ферзь на d6
export const ADVANTAGE_ELO = 1400;
export const ADVANTAGE_MOVE_LIMIT = 30;
export const ADVANTAGE_EXTRA_QUEEN_SQUARE: Square = 'd6';
export const ADVANTAGE_EXTRA_QUEEN_BONUS = 150;

// Стандартная позиция + чёрный ферзь на d6 (проверено: не шах, FEN валиден)
export const ADVANTAGE_START_FEN = 'rnbqkbnr/pppppppp/3q4/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function generateAdvantageFen(): string {
  return ADVANTAGE_START_FEN;
}

// По истечении лимита ходов победитель определяется по перевесу в материале
export function resolveAdvantageByMaterial(chess: Chess): 'win' | 'lose' | 'draw' {
  const white = countMaterial(chess, 'w');
  const black = countMaterial(chess, 'b');
  if (white > black) return 'win';
  if (black > white) return 'lose';
  return 'draw';
}
