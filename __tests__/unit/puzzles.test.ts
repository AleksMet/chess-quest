import { Chess } from 'chess.js';
import { CHAPTER_1_PUZZLES, getPuzzlesForChapter, getRandomPuzzle } from '../../src/data/puzzles';

describe('puzzles data', () => {
  it('has exactly 50 chapter-1 puzzles', () => {
    expect(CHAPTER_1_PUZZLES).toHaveLength(50);
  });

  it('all puzzles have valid FEN', () => {
    for (const p of CHAPTER_1_PUZZLES) {
      expect(() => new Chess(p.fen)).not.toThrow();
    }
  });

  it('all puzzles have at least one move', () => {
    for (const p of CHAPTER_1_PUZZLES) {
      expect(p.moves.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all puzzles have a rating between 800 and 1100', () => {
    for (const p of CHAPTER_1_PUZZLES) {
      expect(p.rating).toBeGreaterThanOrEqual(800);
      expect(p.rating).toBeLessThanOrEqual(1100);
    }
  });

  it('all puzzles have unique ids', () => {
    const ids = CHAPTER_1_PUZZLES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all puzzles have at least one theme', () => {
    for (const p of CHAPTER_1_PUZZLES) {
      expect(p.themes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('getPuzzlesForChapter returns chapter 1 puzzles for index 0', () => {
    const pool = getPuzzlesForChapter(0);
    expect(pool).toHaveLength(50);
  });

  it('getRandomPuzzle returns a valid puzzle', () => {
    const p = getRandomPuzzle(0);
    expect(p).toBeDefined();
    expect(p.id).toBeDefined();
    expect(p.moves.length).toBeGreaterThan(0);
  });

  it('first puzzle move is a valid UCI string', () => {
    for (const p of CHAPTER_1_PUZZLES) {
      const move = p.moves[0];
      expect(move).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
    }
  });
});
