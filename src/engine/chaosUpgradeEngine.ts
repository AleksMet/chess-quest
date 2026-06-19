import type { Chess, Move, PieceSymbol, Square } from 'chess.js';
import type { PieceUpgrade, UpgradeType } from '../types/chaos';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import { calcCaptureScore } from './scoreEngine';

// Порог «Засады»: фигура должна простоять на месте без движения столько ходов, прежде чем взятие удвоит золото
const AMBUSH_TRIGGER_TURNS = 3;

// Ценность фигур для улучшения «Снайпер»
const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function bonusGoldFor(upgradeType: UpgradeType): number {
  return UPGRADE_DEFINITIONS.find(d => d.type === upgradeType)?.bonusGold ?? 0;
}

// Сработавшее улучшение на ходе игрока — тип и величина бонуса (для начисления золота и попапа)
export interface UpgradeTrigger {
  upgradeType: UpgradeType;
  bonus: number;
}

// Золото за серию взятий Берсерка: серия 1→30, 2→35, 3→40, 4→50, 5→55, 6+→60
const BERSERK_STREAK_GOLD = [30, 35, 40, 50, 55, 60];

// startBonus переопределяет награду за первое взятие серии — у персонажа «Берсерк» она выше стандартных 30
export function berserkStreakBonus(streak: number, startBonus: number = BERSERK_STREAK_GOLD[0]): number {
  if (streak <= 0) return 0;
  if (streak === 1) return startBonus;
  const index = Math.min(streak - 1, BERSERK_STREAK_GOLD.length - 1);
  return BERSERK_STREAK_GOLD[index];
}

// Страж: награда за каждые triggerTurns ходов выживания.
// upgradeType — конкретный тип (guard / guard_2 / guard_3) для правильного bonusGold.
// guard_2 срабатывает каждые 4 хода, guard_3 — каждые 3.
export function guardSurvivalBonus(upgradeType: UpgradeType, turnsAlive: number, triggerTurns: number = 5): number {
  const effectiveTrigger =
    upgradeType === 'guard_3' ? Math.min(triggerTurns, 3) :
    upgradeType === 'guard_2' ? Math.min(triggerTurns, 4) :
    triggerTurns;
  return turnsAlive > 0 && turnsAlive % effectiveTrigger === 0 ? bonusGoldFor(upgradeType) : 0;
}

// Провокатор: фигура стоит под атакой чёрных
export function isProvocateurThreatened(chess: Chess, square: Square): boolean {
  return chess.isAttacked(square, 'b');
}

// Определяет, какие улучшения сработали на ходе игрока, и сколько золота каждое приносит.
// upgrades — снимок улучшений ДО обновления счётчиков этим ходом (turnsOnPosition отражает,
// сколько ходов фигура простояла на клетке, с которой она сейчас уходит/берёт).
// Берсерк (серия), Страж (выживание) и Провокатор считаются отдельно в chaos-battle.tsx —
// у них другие источники данных и моменты срабатывания (не вписываются в этот снимок).
export function processPlayerMove(move: Move, upgrades: PieceUpgrade[]): UpgradeTrigger[] {
  const triggers: UpgradeTrigger[] = [];

  for (const upgrade of upgrades) {
    switch (upgrade.upgradeType) {
      case 'sniper':
      case 'sniper_2':
      case 'sniper_3':
        if (move.captured && PIECE_VALUES[move.captured] > PIECE_VALUES[move.piece]) {
          if (upgrade.currentSquare !== undefined) {
            if (upgrade.currentSquare !== move.from) break;
          } else {
            if (upgrade.pieceType !== move.piece) break;
          }
          triggers.push({ upgradeType: upgrade.upgradeType, bonus: bonusGoldFor(upgrade.upgradeType) });
        }
        break;
      case 'ambush':
        // Бонус равен золоту за само взятие — вместе с базовым начислением получается ×2
        if (move.captured && upgrade.pieceType === move.piece && upgrade.turnsOnPosition >= AMBUSH_TRIGGER_TURNS) {
          triggers.push({ upgradeType: 'ambush', bonus: calcCaptureScore(move.captured) });
        }
        break;
    }
  }

  return triggers;
}
