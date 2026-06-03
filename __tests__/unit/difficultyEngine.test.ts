import {
  calculateNextOpponentElo,
  recordBattleResult,
  createDifficultyState,
  eloToSkillLevel,
} from '../../src/engine/difficultyEngine';

describe('difficultyEngine', () => {
  describe('calculateNextOpponentElo', () => {
    it('returns base ELO when no results yet', () => {
      const state = createDifficultyState(500);
      expect(calculateNextOpponentElo(state)).toBe(500);
    });

    it('increases ELO when win rate > 70%', () => {
      const state = {
        currentElo: 500,
        chapterBaseElo: 500,
        recentResults: [true, true, true, true, false], // 80% win rate
      };
      const nextElo = calculateNextOpponentElo(state);
      expect(nextElo).toBe(550); // +50
    });

    it('decreases ELO when win rate < 30%', () => {
      const state = {
        currentElo: 500,
        chapterBaseElo: 500,
        recentResults: [false, false, false, false, true], // 20% win rate
      };
      const nextElo = calculateNextOpponentElo(state);
      expect(nextElo).toBe(450); // -50
    });

    it('keeps ELO stable when win rate is between 30% and 70%', () => {
      const state = {
        currentElo: 500,
        chapterBaseElo: 500,
        recentResults: [true, false, true, false, false], // 40% win rate
      };
      const nextElo = calculateNextOpponentElo(state);
      expect(nextElo).toBe(500); // no change
    });

    it('clamps ELO to chapterBase + 100 maximum', () => {
      const state = {
        currentElo: 590,
        chapterBaseElo: 500,
        recentResults: [true, true, true, true, true], // 100% win rate
      };
      const nextElo = calculateNextOpponentElo(state);
      expect(nextElo).toBe(550); // 500 + 50, not 590 + 50
      expect(nextElo).toBeLessThanOrEqual(600); // max is base + 100
    });

    it('clamps ELO to chapterBase - 100 minimum', () => {
      const state = {
        currentElo: 410,
        chapterBaseElo: 500,
        recentResults: [false, false, false, false, false], // 0% win rate
      };
      const nextElo = calculateNextOpponentElo(state);
      expect(nextElo).toBe(450); // 500 - 50, not below 400
      expect(nextElo).toBeGreaterThanOrEqual(400); // min is base - 100
    });

    it('does not exceed ±100 of chapter base ELO', () => {
      const base = 600;
      const stateLow = {
        currentElo: 400,
        chapterBaseElo: base,
        recentResults: [false, false, false, false, false],
      };
      const stateHigh = {
        currentElo: 800,
        chapterBaseElo: base,
        recentResults: [true, true, true, true, true],
      };
      expect(calculateNextOpponentElo(stateLow)).toBeGreaterThanOrEqual(base - 100);
      expect(calculateNextOpponentElo(stateHigh)).toBeLessThanOrEqual(base + 100);
    });
  });

  describe('recordBattleResult', () => {
    it('adds a win to recent results', () => {
      const state = createDifficultyState(500);
      const updated = recordBattleResult(state, true);
      expect(updated.recentResults).toEqual([true]);
    });

    it('keeps only the last 5 results', () => {
      let state = createDifficultyState(500);
      for (let i = 0; i < 7; i++) {
        state = recordBattleResult(state, i % 2 === 0);
      }
      expect(state.recentResults.length).toBe(5);
    });

    it('updates currentElo after recording results', () => {
      let state = createDifficultyState(500);
      // Record 4 wins and 1 loss = 80% win rate → ELO should go up
      state = recordBattleResult(state, true);
      state = recordBattleResult(state, true);
      state = recordBattleResult(state, true);
      state = recordBattleResult(state, true);
      state = recordBattleResult(state, false);
      expect(state.currentElo).toBe(550);
    });
  });

  describe('eloToSkillLevel', () => {
    it('maps 400 ELO to skill level 1', () => {
      expect(eloToSkillLevel(400)).toBe(1);
    });

    it('maps 2200 ELO to skill level 20', () => {
      expect(eloToSkillLevel(2200)).toBe(20);
    });

    it('never returns below 1', () => {
      expect(eloToSkillLevel(0)).toBe(1);
    });

    it('never returns above 20', () => {
      expect(eloToSkillLevel(9999)).toBe(20);
    });
  });
});
