import type { PieceSymbol } from 'chess.js';

// Русские названия фигур по типу — используется в HUD улучшений и модалках режима ХАОС
export const PIECE_DISPLAY_NAME: Record<PieceSymbol, string> = {
  k: 'Король', q: 'Ферзь', r: 'Ладья', b: 'Слон', n: 'Конь', p: 'Пешка',
};
