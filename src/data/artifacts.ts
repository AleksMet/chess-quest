import { Chess } from 'chess.js';
import type { Color } from 'chess.js';
import type { Artifact, BattleContext, RewardResult } from '../types';
import {
  detectFork,
  detectPin,
  detectOpenFile,
  isPromotion,
  isCastling,
  isCenterSquare,
  countBishopControlledSquares,
} from '../utils/chessHelpers';

function empty(): RewardResult {
  return { gold: 0, masteryStars: 0, triggeredArtifactIds: [], log: [] };
}

function reward(id: string, gold: number, msg: string): RewardResult {
  return { gold, masteryStars: 0, triggeredArtifactIds: [id], log: [msg] };
}

function playerHasQueen(chess: Chess, color: Color): boolean {
  return chess.board().flat().some(cell => cell?.type === 'q' && cell.color === color);
}

export const ARTIFACTS: Artifact[] = [
  {
    id: 'pawn_march',
    name: 'Пешечный Марш',
    description: '+50 золота за каждое превращение пешки',
    rarity: 'common',
    category: 'pawn',
    shopPrice: 50,
    sellPrice: 25,
    effect: (ctx: BattleContext): RewardResult => {
      if (!isPromotion(ctx.move)) return empty();
      return reward('pawn_march', 50, 'Пешечный Марш: +50 золота');
    },
  },

  {
    id: 'center_defender',
    name: 'Защитник Центра',
    description: '+5 золота за ход пешкой на e4/d4/e5/d5',
    rarity: 'common',
    category: 'pawn',
    shopPrice: 30,
    sellPrice: 15,
    effect: (ctx: BattleContext): RewardResult => {
      if (ctx.move.piece !== 'p') return empty();
      if (!isCenterSquare(ctx.move.to)) return empty();
      return reward('center_defender', 5, 'Защитник Центра: +5 золота');
    },
  },

  {
    id: 'knight_school',
    name: 'Школа Коней',
    description: '+20 золота за каждое взятие конём',
    rarity: 'common',
    category: 'knight',
    shopPrice: 50,
    sellPrice: 25,
    effect: (ctx: BattleContext): RewardResult => {
      if (ctx.move.piece !== 'n' || !ctx.move.captured) return empty();
      return reward('knight_school', 20, 'Школа Коней: +20 золота');
    },
  },

  {
    id: 'fork_master',
    name: 'Мастер Вилок',
    description: '+60 золота за каждую вилку конём',
    rarity: 'rare',
    category: 'knight',
    shopPrice: 100,
    sellPrice: 50,
    effect: (ctx: BattleContext): RewardResult => {
      if (ctx.move.piece !== 'n') return empty();
      if (!detectFork(ctx.chess, ctx.move).isFork) return empty();
      return reward('fork_master', 60, 'Мастер Вилок: +60 золота');
    },
  },

  {
    id: 'diagonal_mage',
    name: 'Диагональный Маг',
    description: '+5 золота за каждую клетку, которую слон контролирует',
    rarity: 'common',
    category: 'bishop',
    shopPrice: 50,
    sellPrice: 25,
    effect: (ctx: BattleContext): RewardResult => {
      if (ctx.move.piece !== 'b') return empty();
      const controlled = countBishopControlledSquares(ctx.chess, ctx.move.to);
      if (controlled === 0) return empty();
      const gold = controlled * 5;
      return reward('diagonal_mage', gold, `Диагональный Маг: +${gold} золота (${controlled} клеток)`);
    },
  },

  {
    id: 'pin_master',
    name: 'Мастер Связок',
    description: '+80 золота за каждую связку',
    rarity: 'rare',
    category: 'bishop',
    shopPrice: 100,
    sellPrice: 50,
    effect: (ctx: BattleContext): RewardResult => {
      if (!detectPin(ctx.chess, ctx.move).isPin) return empty();
      return reward('pin_master', 80, 'Мастер Связок: +80 золота');
    },
  },

  {
    id: 'castle_fortress',
    name: 'Башенная Крепость',
    description: 'Рокировка приносит +80 золота',
    rarity: 'common',
    category: 'rook',
    shopPrice: 50,
    sellPrice: 25,
    effect: (ctx: BattleContext): RewardResult => {
      if (!isCastling(ctx.move)) return empty();
      return reward('castle_fortress', 80, 'Башенная Крепость: +80 золота');
    },
  },

  {
    id: 'line_lord',
    name: 'Владыка Линий',
    description: '+10 золота за ладью на открытой вертикали',
    rarity: 'rare',
    category: 'rook',
    shopPrice: 100,
    sellPrice: 50,
    effect: (ctx: BattleContext): RewardResult => {
      if (!detectOpenFile(ctx.chess, ctx.move).isOpen) return empty();
      return reward('line_lord', 10, 'Владыка Линий: +10 золота');
    },
  },

  {
    id: 'queen_hunter',
    name: 'Охотник на Ферзей',
    description: 'Победа без потери ферзя: +200 золота',
    rarity: 'rare',
    category: 'queen',
    shopPrice: 150,
    sellPrice: 75,
    effect: (ctx: BattleContext): RewardResult => {
      if (!ctx.chess.isCheckmate()) return empty();
      if (ctx.chess.turn() === ctx.playerColor) return empty(); // player lost
      if (!playerHasQueen(ctx.chess, ctx.playerColor)) return empty();
      return reward('queen_hunter', 200, 'Охотник на Ферзей: +200 золота');
    },
  },

  {
    id: 'iron_throne',
    name: 'Железный Трон',
    description: 'Победа без единого шаха королю: +150 золота',
    rarity: 'rare',
    category: 'king',
    shopPrice: 150,
    sellPrice: 75,
    effect: (ctx: BattleContext): RewardResult => {
      if (!ctx.chess.isCheckmate()) return empty();
      if (ctx.chess.turn() === ctx.playerColor) return empty(); // player lost
      if (ctx.kingCheckedThisGame) return empty();
      return reward('iron_throne', 150, 'Железный Трон: +150 золота');
    },
  },
];
