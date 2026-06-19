import { Chess } from 'chess.js';
import type { Move, PieceSymbol, Square } from 'chess.js';
import type { PieceUpgrade, UpgradeType } from '../types/chaos';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import { calcCaptureScore } from './scoreEngine';

const AMBUSH_TRIGGER_TURNS = 3;

const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function bonusGoldFor(upgradeType: UpgradeType): number {
  return UPGRADE_DEFINITIONS.find(d => d.type === upgradeType)?.bonusGold ?? 0;
}

export interface UpgradeTrigger {
  upgradeType: UpgradeType;
  bonus: number;
}

const BERSERK_STREAK_GOLD = [30, 35, 40, 50, 55, 60];

export function berserkStreakBonus(streak: number, startBonus: number = BERSERK_STREAK_GOLD[0]): number {
  if (streak <= 0) return 0;
  if (streak === 1) return startBonus;
  const index = Math.min(streak - 1, BERSERK_STREAK_GOLD.length - 1);
  return BERSERK_STREAK_GOLD[index];
}

// Страж: награда за каждые triggerTurns ходов выживания (старая логика, оставлена для совместимости)
export function guardSurvivalBonus(upgradeType: UpgradeType, turnsAlive: number, triggerTurns: number = 5): number {
  const effectiveTrigger =
    upgradeType === 'guard_3' ? Math.min(triggerTurns, 3) :
    upgradeType === 'guard_2' ? Math.min(triggerTurns, 4) :
    triggerTurns;
  return turnsAlive > 0 && turnsAlive % effectiveTrigger === 0 ? bonusGoldFor(upgradeType) : 0;
}

// Страж: фигура стоит в радиусе 2 клеток от короля
export function isNearKing(pieceSquare: Square, kingSquare: Square): boolean {
  const fileDiff = Math.abs(pieceSquare.charCodeAt(0) - kingSquare.charCodeAt(0));
  const rankDiff = Math.abs(parseInt(pieceSquare[1]) - parseInt(kingSquare[1]));
  return fileDiff <= 2 && rankDiff <= 2;
}

// Провокатор: фигура стоит под атакой чёрных
export function isProvocateurThreatened(chess: Chess, square: Square): boolean {
  return chess.isAttacked(square, 'b');
}

// Квадраты чёрных фигур, атакуемых белой фигурой на square (после хода игрока — fen[1]='b')
function getAttackedEnemyPieces(chess: Chess, square: Square): Square[] {
  const fenParts = chess.fen().split(' ');
  fenParts[1] = 'w';
  try {
    const temp = new Chess(fenParts.join(' '));
    return temp.moves({ square, verbose: true })
      .filter(m => temp.get(m.to as Square)?.color === 'b')
      .map(m => m.to as Square);
  } catch {
    return [];
  }
}

// Вилка: количество атакуемых фигур противника (0 если меньше 2)
function detectFork(chess: Chess, square: Square): number {
  const attacked = getAttackedEnemyPieces(chess, square);
  return attacked.length >= 2 ? attacked.length : 0;
}

// Определяет, какие улучшения сработали на ходе игрока, и сколько золота каждое приносит.
// upgrades — снимок с актуальными счётчиками и currentSquare из liveUpgrades().
// Берсерк, Страж, Провокатор, Инициатор, Фортификатор, Опекун — в chaos-battle.tsx.
export function processPlayerMove(
  move: Move,
  upgrades: PieceUpgrade[],
  chess: Chess,
  battlesCompleted: number,
): UpgradeTrigger[] {
  const triggers: UpgradeTrigger[] = [];
  const baseGold = move.captured ? calcCaptureScore(move.captured) : 0;

  for (const upgrade of upgrades) {
    const { upgradeType } = upgrade;

    // Вспомогательная проверка принадлежности хода этой фигуре
    const isThisPiece = (): boolean => {
      if (upgrade.currentSquare !== undefined) return upgrade.currentSquare === move.from;
      return upgrade.pieceType === move.piece;
    };

    switch (upgradeType) {
      case 'sniper':
      case 'sniper_2':
      case 'sniper_3':
        if (move.captured && PIECE_VALUES[move.captured] > PIECE_VALUES[move.piece]) {
          if (upgrade.currentSquare !== undefined) {
            if (upgrade.currentSquare !== move.from) break;
          } else {
            if (upgrade.pieceType !== move.piece) break;
          }
          triggers.push({ upgradeType, bonus: bonusGoldFor(upgradeType) });
        }
        break;

      case 'ambush':
        if (move.captured && upgrade.pieceType === move.piece && upgrade.turnsOnPosition >= AMBUSH_TRIGGER_TURNS) {
          triggers.push({ upgradeType: 'ambush', bonus: calcCaptureScore(move.captured) });
        }
        break;

      case 'marauder':
      case 'marauder_2':
      case 'marauder_3': {
        if (!isThisPiece()) break;
        const captureMultiplier = upgradeType === 'marauder' ? 0.22
          : upgradeType === 'marauder_2' ? 0.32 : 0.42;
        const captureBonus = move.captured ? Math.floor(baseGold * captureMultiplier) : 0;
        const flatAttackBonus = upgradeType === 'marauder' ? 10
          : upgradeType === 'marauder_2' ? 14 : 20;
        const attackedCount = getAttackedEnemyPieces(chess, move.to).length;
        const attackBonus = attackedCount > 0 ? flatAttackBonus : 0;
        const total = captureBonus + attackBonus;
        if (total > 0) triggers.push({ upgradeType, bonus: total });
        break;
      }

      case 'scout':
      case 'scout_2':
      case 'scout_3': {
        if (!isThisPiece()) break;
        const forked = detectFork(chess, move.to);
        if (forked >= 2) {
          const bonus = upgradeType === 'scout' ? 18 : upgradeType === 'scout_2' ? 22 : 30;
          triggers.push({ upgradeType, bonus });
        }
        break;
      }

      case 'legend':
      case 'legend_2':
      case 'legend_3': {
        if (!move.captured || battlesCompleted === 0) break;
        if (!isThisPiece()) break;
        const percentPerBattle = upgradeType === 'legend' ? 0.08
          : upgradeType === 'legend_2' ? 0.12 : 0.15;
        const maxBonus = upgradeType === 'legend' ? 0.40
          : upgradeType === 'legend_2' ? 0.48 : 0.60;
        const multiplier = Math.min(battlesCompleted * percentPerBattle, maxBonus);
        const bonus = Math.floor(baseGold * multiplier);
        if (bonus > 0) triggers.push({ upgradeType, bonus });
        break;
      }
    }
  }

  return triggers;
}
