import type { BattleContext, RewardResult } from '../types';

const EMPTY: RewardResult = {
  gold: 0,
  masteryStars: 0,
  triggeredArtifactIds: [],
  log: [],
  breakdown: [],
};

/**
 * Processes a move through all active artifacts and applies the hero aura.
 * Returns the combined RewardResult including a breakdown for the gold popup.
 */
export function processMove(context: BattleContext): RewardResult {
  if (context.artifacts.length === 0) {
    return { ...EMPTY };
  }

  const accumulated: RewardResult = {
    gold: 0,
    masteryStars: 0,
    triggeredArtifactIds: [],
    log: [],
    breakdown: [],
  };

  for (const artifact of context.artifacts) {
    const r = artifact.effect(context);
    if (r.gold > 0) {
      accumulated.gold += r.gold;
      accumulated.breakdown.push({
        label: artifact.name,
        value: r.gold,
        type: 'artifact',
      });
    }
    accumulated.masteryStars += r.masteryStars;
    accumulated.triggeredArtifactIds.push(...r.triggeredArtifactIds);
    accumulated.log.push(...r.log);
  }

  const withAura = context.hero.applyAura(accumulated, context);

  // If hero aura added gold, record it in breakdown
  const auraBonus = withAura.gold - accumulated.gold;
  if (auraBonus > 0) {
    withAura.breakdown = [
      ...accumulated.breakdown,
      { label: context.hero.name, value: auraBonus, type: 'hero' as const },
    ];
  }

  return withAura;
}
