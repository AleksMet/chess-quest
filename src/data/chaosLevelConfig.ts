import type { AIUpgrade, AIUpgradeType, TeleportMechanic } from '../engine/chaosAIUpgrades';
import type { PieceSymbol } from 'chess.js';

export type { AIUpgrade, AIUpgradeType, TeleportMechanic };

// Спавн фигур ИИ во время боя — например, король-Всадник призывает коней каждый ход
export interface SpawnMechanic {
  type: 'knight';
  triggerPiece: PieceSymbol;
  maxSpawns: number;
  intervalMoves: number;
}

// Эволюция фигур ИИ во время боя — раз в intervalMoves ходов случайная фигура
// эволюционирует по цепочке (пешка → конь/слон → ладья → ферзь), не превышая maxQueens ферзей
export interface EvolutionMechanic {
  intervalMoves: number;
  maxQueens: number;
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
  evolutionMechanic?: EvolutionMechanic;
  teleportMechanic?: TeleportMechanic;
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
        { pieceType: 'q', upgradeType: 'guard' },
      ],
      evolutionMechanic: {
        intervalMoves: 5,
        maxQueens: 3,
      },
    },
  },
  {
    level: 3,
    startingGold: 100,
    battles: [
      {
        elo: 1200,
        aiUpgrades: [
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'n', upgradeType: 'berserk' },
        ],
      },
      {
        elo: 1300,
        aiUpgrades: [
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'r', upgradeType: 'guard' },
        ],
      },
      {
        elo: 1400,
        aiUpgrades: [
          { pieceType: 'n', upgradeType: 'berserk' },
          { pieceType: 'n', upgradeType: 'berserk' },
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'r', upgradeType: 'guard' },
        ],
      },
      {
        elo: 1500,
        aiUpgrades: [
          { pieceType: 'n', upgradeType: 'berserk' },
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'b', upgradeType: 'sniper' },
          { pieceType: 'r', upgradeType: 'guard' },
          { pieceType: 'q', upgradeType: 'guard' },
        ],
      },
    ],
    eliteBattle: {
      elo: 1600,
      aiUpgrades: [
        { pieceType: 'n', upgradeType: 'berserk' },
        { pieceType: 'n', upgradeType: 'berserk' },
        { pieceType: 'b', upgradeType: 'sniper' },
        { pieceType: 'b', upgradeType: 'sniper' },
        { pieceType: 'q', upgradeType: 'guard' },
      ],
    },
    bossConfig: {
      elo: 1800,
      name: 'Ведьма Диагоналей',
      intro: 'Ты уже связан. Ты просто ещё не знаешь этого.',
      aiUpgrades: [
        { pieceType: 'b', upgradeType: 'sniper' },
        { pieceType: 'b', upgradeType: 'sniper' },
        { pieceType: 'n', upgradeType: 'berserk' },
        { pieceType: 'q', upgradeType: 'guard' },
      ],
      teleportMechanic: {
        intervalMoves: 5,
        targetPieces: ['b', 'n'], // снайперы и берсерк телепортируются
        excludePieces: ['k', 'q'], // король и страж-ферзь остаются
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
