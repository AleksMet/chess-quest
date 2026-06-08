import type { PieceSymbol } from 'chess.js';

// Типы улучшений фигур в режиме ХАОС
export type UpgradeType =
  | 'greedy'    // Жадный
  | 'berserk'   // Берсерк
  | 'sniper'    // Снайпер
  | 'guard'     // Страж
  | 'fortress'; // Крепость

export type UpgradeCategory = 'attack' | 'defense';

// Улучшение, купленное на конкретный экземпляр фигуры (не на тип)
export interface PieceUpgrade {
  id: string;              // уникальный id: 'knight_1_berserk'
  pieceType: PieceSymbol;  // 'p'|'n'|'b'|'r'|'q'|'k'
  pieceIndex: number;      // если две одинаковые фигуры — 0 или 1
  upgradeType: UpgradeType;
  category: UpgradeCategory;
  turnsOnPosition: number; // для Крепости и Стража — сколько ходов подряд фигура стоит на месте
}

// Описание улучшения для магазина
export interface ChaosUpgradeDefinition {
  type: UpgradeType;
  category: UpgradeCategory;
  name: string;
  description: string; // пояснение для игрока
  price: number;
  bonusGold: number;
}
