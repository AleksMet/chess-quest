import {
  calcMateScore,
  calcCaptureScore,
  calcFlagHoldScore,
  calcSurvivalScore,
  calcChapterStars,
} from '../../src/engine/scoreEngine';

describe('calcMateScore', () => {
  it('full limit remaining gives maximum bonus', () => {
    expect(calcMateScore(0, 15)).toBe(500 + 15 * 20); // 800
  });

  it('no moves remaining gives base score only', () => {
    expect(calcMateScore(15, 15)).toBe(500);
  });

  it('partial moves used', () => {
    expect(calcMateScore(5, 15)).toBe(500 + 10 * 20); // 700
  });

  it('movesUsed > movesLimit still returns base score (no negative bonus)', () => {
    expect(calcMateScore(20, 15)).toBe(500);
  });
});

describe('calcCaptureScore', () => {
  it('pawn = 10', () => { expect(calcCaptureScore('p')).toBe(10); });
  it('knight = 30', () => { expect(calcCaptureScore('n')).toBe(30); });
  it('bishop = 30', () => { expect(calcCaptureScore('b')).toBe(30); });
  it('rook = 50', () => { expect(calcCaptureScore('r')).toBe(50); });
  it('queen = 90', () => { expect(calcCaptureScore('q')).toBe(90); });
  it('king = 0', () => { expect(calcCaptureScore('k')).toBe(0); });
  it('uppercase piece type works', () => { expect(calcCaptureScore('Q')).toBe(90); });
  it('unknown piece type = 0', () => { expect(calcCaptureScore('x')).toBe(0); });
});

describe('calcFlagHoldScore', () => {
  it('0 moves = 0 score', () => { expect(calcFlagHoldScore(0)).toBe(0); });
  it('3 moves = 120', () => { expect(calcFlagHoldScore(3)).toBe(120); });
  it('linear scaling', () => { expect(calcFlagHoldScore(5)).toBe(200); });
});

describe('calcSurvivalScore', () => {
  it('0 moves = 0 score', () => { expect(calcSurvivalScore(0)).toBe(0); });
  it('10 moves = 150', () => { expect(calcSurvivalScore(10)).toBe(150); });
  it('25 moves = 375', () => { expect(calcSurvivalScore(25)).toBe(375); });
});

describe('calcChapterStars', () => {
  it('score <= 500 → 1 star', () => { expect(calcChapterStars(500)).toBe(1); });
  it('score 1501 → 2 stars', () => { expect(calcChapterStars(1501)).toBe(2); });
  it('score 3001 → 3 stars', () => { expect(calcChapterStars(3001)).toBe(3); });
  it('score exactly 1500 → 1 star (threshold is strictly >)', () => {
    expect(calcChapterStars(1500)).toBe(1);
  });
  it('score exactly 3000 → 2 stars (threshold is strictly >)', () => {
    expect(calcChapterStars(3000)).toBe(2);
  });
});
