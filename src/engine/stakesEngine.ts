export const BASE_WIN_GOLD = 40;
export const BASE_DRAW_GOLD = 15;
export const BASE_LOSE_GOLD = 5;

export interface StakeConfig {
  id: 'none' | 'small' | 'medium' | 'all_in';
  label: string;
  emoji: string;
  color: string;
  borderColor: string;
  multiplier: number;
  getAmount: (gold: number) => number;
}

export const STAKE_CONFIGS: StakeConfig[] = [
  {
    id: 'none',
    label: 'Без ставки',
    emoji: '🎯',
    color: '#1e293b',
    borderColor: '#475569',
    multiplier: 0,
    getAmount: () => 0,
  },
  {
    id: 'small',
    label: '25 золота',
    emoji: '🟡',
    color: '#1c1400',
    borderColor: '#ca8a04',
    multiplier: 2.0,
    getAmount: () => 25,
  },
  {
    id: 'medium',
    label: '50 золота',
    emoji: '🟠',
    color: '#1c0800',
    borderColor: '#ea580c',
    multiplier: 2.5,
    getAmount: () => 50,
  },
  {
    id: 'all_in',
    label: 'Ва-банк',
    emoji: '🔴',
    color: '#1c0000',
    borderColor: '#dc2626',
    multiplier: 3.0,
    getAmount: (gold: number) => gold,
  },
];

/**
 * Calculate gold earned after a staked battle.
 * multiplier === 0 means "no stake" — flat base rewards apply.
 * stake is the amount ALREADY spent (deducted before battle).
 */
export function computeStakeGold(
  result: 'win' | 'lose' | 'draw',
  stake: number,
  multiplier: number,
): number {
  if (multiplier === 0) {
    if (result === 'win') return BASE_WIN_GOLD;
    if (result === 'draw') return BASE_DRAW_GOLD;
    return BASE_LOSE_GOLD;
  }
  if (result === 'win') return Math.round(stake * multiplier);
  if (result === 'draw') return Math.round(stake * 0.5);
  return 0; // lose: stake was already spent, nothing back
}

export function stakeIsAffordable(config: StakeConfig, gold: number): boolean {
  if (config.id === 'none') return true;
  const amount = config.getAmount(gold);
  return amount > 0 && amount <= gold;
}
