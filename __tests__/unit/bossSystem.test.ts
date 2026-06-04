import { BOSSES, getBossForChapter } from '../../src/data/bosses';

describe('bossSystem', () => {
  it('has at least one boss defined', () => {
    expect(BOSSES.length).toBeGreaterThan(0);
  });

  it('returns the Goblin King for chapter 0', () => {
    const boss = getBossForChapter(0);
    expect(boss).not.toBeNull();
    expect(boss?.id).toBe('goblin_king');
  });

  it('Goblin King has a dialog before battle', () => {
    const boss = getBossForChapter(0);
    expect(boss?.dialogBefore.length).toBeGreaterThan(10);
  });

  it('Goblin King has a dialog after battle', () => {
    const boss = getBossForChapter(0);
    expect(boss?.dialogAfter.length).toBeGreaterThan(10);
  });

  it('Goblin King ELO is between 600 and 900', () => {
    const boss = getBossForChapter(0);
    expect(boss?.elo).toBeGreaterThanOrEqual(600);
    expect(boss?.elo).toBeLessThanOrEqual(900);
  });

  it('Goblin King gives reward gold', () => {
    const boss = getBossForChapter(0);
    expect(boss?.rewardGold).toBeGreaterThan(0);
  });

  it('Goblin King has a weakness description', () => {
    const boss = getBossForChapter(0);
    expect(boss?.weakness.length).toBeGreaterThan(0);
  });

  it('returns null for a non-existent chapter', () => {
    const boss = getBossForChapter(99);
    expect(boss).toBeNull();
  });

  it('all bosses have required fields', () => {
    BOSSES.forEach(boss => {
      expect(boss.id).toBeTruthy();
      expect(boss.name).toBeTruthy();
      expect(boss.dialogBefore).toBeTruthy();
      expect(boss.dialogAfter).toBeTruthy();
      expect(boss.weakness).toBeTruthy();
      expect(boss.elo).toBeGreaterThan(0);
      expect(boss.rewardGold).toBeGreaterThan(0);
    });
  });
});
