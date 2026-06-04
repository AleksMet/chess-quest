import {
  computeStakeGold,
  stakeIsAffordable,
  STAKE_CONFIGS,
  BASE_WIN_GOLD,
  BASE_DRAW_GOLD,
  BASE_LOSE_GOLD,
} from '../../src/engine/stakesEngine';

describe('stakesEngine — computeStakeGold', () => {
  describe('no stake (multiplier = 0)', () => {
    it('win returns BASE_WIN_GOLD', () => {
      expect(computeStakeGold('win', 0, 0)).toBe(BASE_WIN_GOLD);
    });
    it('draw returns BASE_DRAW_GOLD', () => {
      expect(computeStakeGold('draw', 0, 0)).toBe(BASE_DRAW_GOLD);
    });
    it('lose returns BASE_LOSE_GOLD', () => {
      expect(computeStakeGold('lose', 0, 0)).toBe(BASE_LOSE_GOLD);
    });
  });

  describe('small stake ×2.0', () => {
    it('win returns stake × 2.0', () => {
      expect(computeStakeGold('win', 25, 2.0)).toBe(50);
    });
    it('draw returns half stake', () => {
      expect(computeStakeGold('draw', 25, 2.0)).toBe(13); // Math.round(12.5)
    });
    it('lose returns 0', () => {
      expect(computeStakeGold('lose', 25, 2.0)).toBe(0);
    });
  });

  describe('medium stake ×2.5', () => {
    it('win returns stake × 2.5', () => {
      expect(computeStakeGold('win', 50, 2.5)).toBe(125);
    });
    it('draw returns half stake', () => {
      expect(computeStakeGold('draw', 50, 2.5)).toBe(25);
    });
    it('lose returns 0', () => {
      expect(computeStakeGold('lose', 50, 2.5)).toBe(0);
    });
  });

  describe('all-in stake ×3.0', () => {
    it('win returns stake × 3.0', () => {
      expect(computeStakeGold('win', 100, 3.0)).toBe(300);
    });
    it('win with odd amount rounds correctly', () => {
      expect(computeStakeGold('win', 33, 3.0)).toBe(99);
    });
    it('draw returns half stake', () => {
      expect(computeStakeGold('draw', 100, 3.0)).toBe(50);
    });
    it('lose returns 0', () => {
      expect(computeStakeGold('lose', 100, 3.0)).toBe(0);
    });
    it('win with zero gold (all-in on nothing) returns 0', () => {
      expect(computeStakeGold('win', 0, 3.0)).toBe(0);
    });
  });
});

describe('stakesEngine — stakeIsAffordable', () => {
  const none   = STAKE_CONFIGS.find(c => c.id === 'none')!;
  const small  = STAKE_CONFIGS.find(c => c.id === 'small')!;
  const medium = STAKE_CONFIGS.find(c => c.id === 'medium')!;
  const allIn  = STAKE_CONFIGS.find(c => c.id === 'all_in')!;

  it('"none" is always affordable regardless of gold', () => {
    expect(stakeIsAffordable(none, 0)).toBe(true);
    expect(stakeIsAffordable(none, 1000)).toBe(true);
  });

  it('"small" (25) is affordable with 25+ gold', () => {
    expect(stakeIsAffordable(small, 25)).toBe(true);
    expect(stakeIsAffordable(small, 100)).toBe(true);
  });

  it('"small" is not affordable with less than 25 gold', () => {
    expect(stakeIsAffordable(small, 0)).toBe(false);
    expect(stakeIsAffordable(small, 24)).toBe(false);
  });

  it('"medium" (50) is affordable with 50+ gold', () => {
    expect(stakeIsAffordable(medium, 50)).toBe(true);
    expect(stakeIsAffordable(medium, 200)).toBe(true);
  });

  it('"medium" is not affordable with less than 50 gold', () => {
    expect(stakeIsAffordable(medium, 0)).toBe(false);
    expect(stakeIsAffordable(medium, 49)).toBe(false);
  });

  it('"all_in" is affordable with any gold > 0', () => {
    expect(stakeIsAffordable(allIn, 1)).toBe(true);
    expect(stakeIsAffordable(allIn, 999)).toBe(true);
  });

  it('"all_in" is not affordable with 0 gold', () => {
    expect(stakeIsAffordable(allIn, 0)).toBe(false);
  });
});

describe('stakesEngine — STAKE_CONFIGS', () => {
  it('has exactly 4 options', () => {
    expect(STAKE_CONFIGS).toHaveLength(4);
  });

  it('ids are none, small, medium, all_in', () => {
    expect(STAKE_CONFIGS.map(c => c.id)).toEqual(['none', 'small', 'medium', 'all_in']);
  });

  it('multipliers increase from 0 to 3.0', () => {
    const mults = STAKE_CONFIGS.map(c => c.multiplier);
    expect(mults[0]).toBe(0);
    expect(mults[1]).toBe(2.0);
    expect(mults[2]).toBe(2.5);
    expect(mults[3]).toBe(3.0);
  });
});
