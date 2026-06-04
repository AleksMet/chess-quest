import { Chess } from 'chess.js';
import {
  generateQuickBattlePosition,
  generateAmbushPosition,
  countMaterial,
} from '../../src/engine/positionGenerator';

describe('positionGenerator', () => {
  describe('generateQuickBattlePosition', () => {
    it('returns a valid FEN', () => {
      const fen = generateQuickBattlePosition();
      expect(() => new Chess(fen)).not.toThrow();
    });

    it('returns a position with no check', () => {
      const fen = generateQuickBattlePosition();
      const chess = new Chess(fen);
      expect(chess.isCheck()).toBe(false);
    });

    it('returns different positions across calls (probabilistic)', () => {
      const fens = new Set(Array.from({ length: 20 }, () => generateQuickBattlePosition()));
      expect(fens.size).toBeGreaterThan(1);
    });
  });

  describe('generateAmbushPosition', () => {
    it('returns a valid FEN', () => {
      const fen = generateAmbushPosition();
      expect(() => new Chess(fen)).not.toThrow();
    });

    it('black has more material than white (player disadvantage)', () => {
      // Run several times to cover all positions
      let foundDisadvantage = false;
      for (let i = 0; i < 20; i++) {
        const fen = generateAmbushPosition();
        const chess = new Chess(fen);
        const whiteMat = countMaterial(chess, 'w');
        const blackMat = countMaterial(chess, 'b');
        if (blackMat > whiteMat) { foundDisadvantage = true; break; }
      }
      expect(foundDisadvantage).toBe(true);
    });
  });

  describe('countMaterial', () => {
    it('counts starting position correctly (white)', () => {
      const chess = new Chess();
      // Q=9 + 2R=10 + 2B=6 + 2N=6 + 8P=8 = 39
      expect(countMaterial(chess, 'w')).toBe(39);
    });

    it('counts starting position correctly (black)', () => {
      const chess = new Chess();
      expect(countMaterial(chess, 'b')).toBe(39);
    });

    it('returns 0 for an empty board position', () => {
      // King-only position
      const chess = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      expect(countMaterial(chess, 'w')).toBe(0);
      expect(countMaterial(chess, 'b')).toBe(0);
    });

    it('counts single queen correctly', () => {
      const chess = new Chess('4k3/8/8/8/8/8/8/4KQ2 w - - 0 1');
      expect(countMaterial(chess, 'w')).toBe(9);
    });
  });
});
