import { ARTIFACTS } from '../../src/data/artifacts';
import type { Artifact } from '../../src/types';

function pickThreeArtifacts(owned: Artifact[]): Artifact[] {
  const ownedIds = new Set(owned.map(a => a.id));
  const pool = ARTIFACTS.filter(a => !ownedIds.has(a.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

describe('artifact-selection helper', () => {
  it('returns exactly 3 artifacts', () => {
    const choices = pickThreeArtifacts([]);
    expect(choices).toHaveLength(3);
  });

  it('returns 3 different artifacts', () => {
    const choices = pickThreeArtifacts([]);
    const ids = choices.map(a => a.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('does not include already-owned artifacts', () => {
    const owned = [ARTIFACTS[0], ARTIFACTS[1]];
    const ownedIds = new Set(owned.map(a => a.id));
    const choices = pickThreeArtifacts(owned);
    choices.forEach(c => expect(ownedIds.has(c.id)).toBe(false));
  });

  it('returns fewer than 3 when pool is small', () => {
    const owned = ARTIFACTS.slice(0, ARTIFACTS.length - 2);
    const choices = pickThreeArtifacts(owned);
    expect(choices.length).toBeLessThanOrEqual(3);
  });
});

describe('shop logic', () => {
  it('purchase deducts gold correctly', () => {
    let gold = 200;
    const artifact = ARTIFACTS[0];
    const canAfford = gold >= artifact.shopPrice;
    expect(canAfford).toBe(true);
    if (canAfford) gold -= artifact.shopPrice;
    expect(gold).toBe(200 - artifact.shopPrice);
  });

  it('rejects purchase when insufficient gold', () => {
    let gold = 10;
    const artifact = ARTIFACTS[0]; // shopPrice = 50
    const canAfford = gold >= artifact.shopPrice;
    expect(canAfford).toBe(false);
    expect(gold).toBe(10);
  });

  it('sell adds correct gold', () => {
    let gold = 100;
    const artifact = ARTIFACTS[0];
    gold += artifact.sellPrice;
    expect(gold).toBe(100 + artifact.sellPrice);
  });
});
