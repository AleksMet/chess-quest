import type { PieceSymbol } from 'chess.js';

// Типы улучшений фигур в режиме ХАОС
export type UpgradeType =
  | 'berserk'      // Берсерк
  | 'sniper'       // Снайпер
  | 'provocateur'  // Провокатор
  | 'guard'        // Страж
  | 'ambush';      // Засада

export type UpgradeCategory = 'attack' | 'defense';

// Улучшение, купленное на конкретный экземпляр фигуры (не на тип)
export interface PieceUpgrade {
  id: string;              // уникальный id: 'knight_1_berserk'
  pieceType: PieceSymbol;  // 'p'|'n'|'b'|'r'|'q'|'k'
  pieceIndex: number;      // если две одинаковые фигуры — 0 или 1
  upgradeType: UpgradeType;
  category: UpgradeCategory;
  turnsOnPosition: number; // для Засады — сколько ходов подряд фигура стоит на месте
  turnsAlive: number;      // для Стража — сколько ходов фигура выживает без взятия
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
