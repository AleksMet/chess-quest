import type { Move, PieceSymbol } from 'chess.js';
import type { PieceUpgrade, UpgradeType } from '../types/chaos';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';

// Ценность фигур для улучшения «Снайпер»
const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function bonusGoldFor(upgradeType: UpgradeType): number {
  return UPGRADE_DEFINITIONS.find(d => d.type === upgradeType)?.bonusGold ?? 0;
}

// Сработавшее улучшение на ходе игрока — тип и величина бонуса (для начисления золота и попапа)
export interface UpgradeTrigger {
  upgradeType: UpgradeType;
  bonus: number;
}

// Определяет, какие улучшения сработали на ходе игрока, и сколько золота каждое приносит.
// turnsOnPosition обновляется вызывающей стороной — здесь только проверка порога.
// Страж считается отдельно в chaos-battle.tsx (там же отслеживаются ходы на месте для подсветки).
export function processPlayerMove(move: Move, upgrades: PieceUpgrade[]): UpgradeTrigger[] {
  const triggers: UpgradeTrigger[] = [];

  for (const upgrade of upgrades) {
    switch (upgrade.upgradeType) {
      case 'greedy':
        if (move.captured && upgrade.pieceType === move.piece) {
          triggers.push({ upgradeType: 'greedy', bonus: bonusGoldFor('greedy') });
        }
        break;
      case 'berserk':
        if (move.captured && upgrade.pieceType === move.piece) {
          triggers.push({ upgradeType: 'berserk', bonus: bonusGoldFor('berserk') });
        }
        break;
      case 'sniper':
        if (move.captured && upgrade.pieceType === move.piece
            && PIECE_VALUES[move.captured] > PIECE_VALUES[move.piece]) {
          triggers.push({ upgradeType: 'sniper', bonus: bonusGoldFor('sniper') });
        }
        break;
      case 'fortress':
        if (upgrade.turnsOnPosition >= 3) {
          triggers.push({ upgradeType: 'fortress', bonus: bonusGoldFor('fortress') });
        }
        break;
    }
  }

  return triggers;
}
