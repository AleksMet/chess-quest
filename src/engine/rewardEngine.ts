import type { BattleContext, RewardResult } from '../types';

const EMPTY: RewardResult = {
  gold: 0,
  masteryStars: 0,
  triggeredArtifactIds: [],
  log: [],
};

/**
 * Processes a move through all active artifacts and applies the hero aura.
 * Returns the combined RewardResult for this move.
 */
export function processMove(context: BattleContext): RewardResult {
  console.log('[REWARD] called, artifacts:', context.artifacts.length, 'move:', context.move?.san);
  if (context.artifacts.length === 0) {
    return { ...EMPTY };
  }

  const accumulated: RewardResult = {
    gold: 0,
    masteryStars: 0,
    triggeredArtifactIds: [],
    log: [],
  };

  for (const artifact of context.artifacts) {
    const r = artifact.effect(context);
    accumulated.gold += r.gold;
    accumulated.masteryStars += r.masteryStars;
    accumulated.triggeredArtifactIds.push(...r.triggeredArtifactIds);
    accumulated.log.push(...r.log);
  }

  return context.hero.applyAura(accumulated, context);
}
