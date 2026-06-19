import type { PieceSymbol } from 'chess.js';
import type { UpgradeRarity } from './mechanics';

export type ChaosEventId =
  | 'old_blacksmith' | 'deserter' | 'war_loot' | 'secret_arsenal'
  | 'relic_trader'   | 'alchemist' | 'fortune_teller' | 'recruiter'
  | 'enemy_ambush'   | 'traitor'   | 'treasury_fire'  | 'curse';

export type ChaosEventCategory = 'positive' | 'neutral' | 'negative';

export interface ChaosEventDef {
  id: ChaosEventId;
  category: ChaosEventCategory;
  icon: string;
  name: string;
  description: string;
  optionAccept?: string;
  optionDecline?: string;
}

// Типы улучшений фигур в режиме ХАОС (семейства × уровни ур.1/2/3)
export type UpgradeType =
  | 'berserk'    | 'berserk_2'    | 'berserk_3'
  | 'guard'      | 'guard_2'      | 'guard_3'
  | 'fortifier'  | 'fortifier_2'  | 'fortifier_3'
  | 'initiator'  | 'initiator_2'  | 'initiator_3'
  | 'sniper'     | 'sniper_2'     | 'sniper_3'
  | 'caretaker'  | 'caretaker_2'  | 'caretaker_3'
  | 'marauder'   | 'marauder_2'   | 'marauder_3'
  | 'scout'      | 'scout_2'      | 'scout_3'
  | 'legend'     | 'legend_2'     | 'legend_3'
  | 'provocateur'
  | 'ambush'

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
  // Текущая клетка фигуры во время боя — заполняется через liveUpgrades() в chaos-battle.
  // undefined вне боя; null — фигура взята; string ('e4') — активная клетка.
  currentSquare?: string | null;
}

// Описание улучшения для магазина
export interface ChaosUpgradeDefinition {
  type: UpgradeType;
  category: UpgradeCategory;
  name: string;
  description: string;
  price: number;
  bonusGold: number;
  rarity: UpgradeRarity;
}

// Идентификатор персонажа режима ХАОС
export type CharacterId = 'merchant' | 'berserk' | 'guardian';

// Игровой персонаж режима ХАОС — задаёт стартовый набор и пассивки на весь забег
export interface ChaosCharacter {
  id: CharacterId;
  name: string;
  description: string;
  startingGold: number;
  startingPieces: PieceSymbol[];
  allowedUpgradeCategories: UpgradeCategory[] | 'all';
  attackUpgradeDiscount: number;   // 0.0 - 1.0 (0.3 = 30% скидка)
  defenseUpgradeDiscount: number;
  captureGoldBonus: number;        // бонус золота за каждое взятие
  berserkStreakStartBonus: number; // с какого значения начинается серия Берсерка
  guardTriggerTurns: number;       // каждые N ходов срабатывает Страж
  upgradeMarkup: number;           // 0.0 - 1.0 (0.2 = 20% наценка)
  unlocked: boolean;
}
