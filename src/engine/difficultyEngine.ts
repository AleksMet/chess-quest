import type { DifficultyState } from '../types';
import { eloToSkillLevel } from './stockfish';

export { eloToSkillLevel };

/**
 * Calculates the ELO for the next opponent based on recent win rate.
 * Win rate > 70% → ELO +50 (harder)
 * Win rate < 30% → ELO -50 (easier)
 * Clamped to ±100 of the chapter base ELO.
 */
export function calculateNextOpponentElo(state: DifficultyState): number {
  const { recentResults, chapterBaseElo } = state;

  if (recentResults.length === 0) return chapterBaseElo;

  const winRate = recentResults.filter(Boolean).length / recentResults.length;

  let adjustment = 0;
  if (winRate > 0.7) adjustment = +50;
  if (winRate < 0.3) adjustment = -50;

  const min = chapterBaseElo - 100;
  const max = chapterBaseElo + 100;

  return Math.max(min, Math.min(max, chapterBaseElo + adjustment));
}

/**
 * Adds a battle result to the recent results window (keeps last 5).
 */
export function recordBattleResult(state: DifficultyState, won: boolean): DifficultyState {
  const updatedResults = [...state.recentResults, won].slice(-5);
  const nextElo = calculateNextOpponentElo({ ...state, recentResults: updatedResults });
  return {
    ...state,
    recentResults: updatedResults,
    currentElo: nextElo,
  };
}

/**
 * Returns the initial DifficultyState for a chapter.
 */
export function createDifficultyState(chapterBaseElo: number): DifficultyState {
  return {
    currentElo: chapterBaseElo,
    recentResults: [],
    chapterBaseElo,
  };
}
