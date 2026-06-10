import type { AIUpgrade, AIUpgradeType } from '../engine/chaosAIUpgrades';
import type { PieceSymbol } from 'chess.js';

export type { AIUpgrade, AIUpgradeType };

// Спавн фигур ИИ во время боя — например, король-Всадник призывает коней каждый ход
export interface SpawnMechanic {
  type: 'knight';
  triggerPiece: PieceSymbol;
  maxSpawns: number;
  intervalMoves: number;
}

// Дополнительное улучшение, выдаваемое фигуре ИИ во время боя — например, конь
// Двуглавого Рыцаря получает Снайпер каждые 5 ходов
export interface SpecialMechanic {
  type: 'upgrade_on_interval';
  intervalMoves: number;
  targetPiece: PieceSymbol;
  addUpgrade: AIUpgradeType;
}

export interface BattleConfig {
  elo: number;
  aiUpgrades: AIUpgrade[];
  aiPieces?: string; // FEN состав AI если отличается от стандартного
}

export interface BossConfig extends BattleConfig {
  name: string;
  intro: string;
  spawnMechanic?: SpawnMechanic;
  specialMechanic?: SpecialMechanic;
}

export interface LevelConfig {
  level: number;
  startingGold: number;
  battles: BattleConfig[];
  eliteBattle: BattleConfig;
  bossConfig: BossConfig;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    startingGold: 150,
    battles: [
      { elo: 800, aiUpgrades: [] },
      { elo: 1000, aiUpgrades: [] },
    ],
    eliteBattle: { elo: 0, aiUpgrades: [] }, // нет элиты на уровне 1
    bossConfig: {
      elo: 1400,
      name: 'Всадник',
      intro: 'Мои всадники сомнут тебя волной!',
      aiUpgrades: [
        { pieceType: 'q', upgradeType: 'berserk' },
      ],
      spawnMechanic: {
        type: 'knight',
        triggerPiece: 'k',
        maxSpawns: 5,
        intervalMoves: 1,
      },
    },
  },
  {
    level: 2,
    startingGold: 120,
    battles: [
      {
        elo: 1000,
        aiUpgrades: [{ pieceType: 'n', upgradeType: 'berserk' }],
      },
      {
        elo: 1100,
        aiUpgrades: [
          { pieceType: 'n', upgradeType: 'berserk' },
          { pieceType: 'b', upgradeType: 'sniper' },
        ],
      },
      {
        elo: 1200,
        aiUpgrades: [
          { pieceType: 'n', upgradeType: 'berserk' },
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'r', upgradeType: 'guard' },
        ],
      },
      {
        elo: 1300,
        aiUpgrades: [
          { pieceType: 'n', upgradeType: 'berserk' },
          { pieceType: 'n', upgradeType: 'berserk' },
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'r', upgradeType: 'guard' },
        ],
      },
    ],
    eliteBattle: {
      elo: 1300,
      aiUpgrades: [
        { pieceType: 'n', upgradeType: 'berserk' },
        { pieceType: 'n', upgradeType: 'berserk' },
        { pieceType: 'b', upgradeType: 'sniper' },
        { pieceType: 'q', upgradeType: 'guard' },
      ],
    },
    bossConfig: {
      elo: 1500,
      name: 'Двуглавый Рыцарь',
      intro: 'Два коня лучше одного. Сдавайся!',
      aiUpgrades: [
        { pieceType: 'n', upgradeType: 'berserk' },
        { pieceType: 'n', upgradeType: 'berserk' },
        { pieceType: 'b', upgradeType: 'sniper' },
        { pieceType: 'q', upgradeType: 'guard' },
      ],
      spawnMechanic: {
        type: 'knight',
        triggerPiece: 'k',
        maxSpawns: 4,
        intervalMoves: 2,
      },
      specialMechanic: {
        type: 'upgrade_on_interval',
        intervalMoves: 5,
        targetPiece: 'n',
        addUpgrade: 'sniper',
      },
    },
  },
];

// Конфигурация боя по уровню и индексу боя ('elite' и 'boss' — отдельные ключи)
export function getBattleConfig(levelConfig: LevelConfig, battleIndex: number | 'elite' | 'boss'): BattleConfig {
  if (battleIndex === 'elite') return levelConfig.eliteBattle;
  if (battleIndex === 'boss') return levelConfig.bossConfig;
  return levelConfig.battles[battleIndex];
}
