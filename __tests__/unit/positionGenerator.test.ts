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

    it('position has no check (white to move)', () => {
      for (let i = 0; i < 10; i++) {
        const fen = generateAmbushPosition();
        const chess = new Chess(fen);
        expect(chess.isCheck()).toBe(false);
      }
    });

    it('black has more material than white (player disadvantage)', () => {
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

    it('white has no queen or rook (only k, n, b, p)', () => {
      for (let i = 0; i < 10; i++) {
        const fen = generateAmbushPosition();
        const boardPart = fen.split(' ')[0];
        // White pieces are uppercase — Q and R must be absent (only K, N, B, P)
        expect(boardPart).not.toMatch(/Q/);
        expect(boardPart).not.toMatch(/R/);
      }
    });

    it('white has 5-6 total pieces (king + 4-5)', () => {
      for (let i = 0; i < 15; i++) {
        const fen = generateAmbushPosition();
        const chess = new Chess(fen);
        const board = chess.board();
        let wCount = 0;
        for (const row of board) {
          for (const sq of row) {
            if (sq && sq.color === 'w') wCount++;
          }
        }
        expect(wCount).toBeGreaterThanOrEqual(5);
        expect(wCount).toBeLessThanOrEqual(6);
      }
    });

    it('black has 8-9 total pieces (king + 7-8)', () => {
      for (let i = 0; i < 15; i++) {
        const fen = generateAmbushPosition();
        const chess = new Chess(fen);
        const board = chess.board();
        let bCount = 0;
        for (const row of board) {
          for (const sq of row) {
            if (sq && sq.color === 'b') bCount++;
          }
        }
        expect(bCount).toBeGreaterThanOrEqual(8);
        expect(bCount).toBeLessThanOrEqual(9);
      }
    });

    it('generates varied positions (not always the same)', () => {
      const fens = new Set(Array.from({ length: 20 }, () => generateAmbushPosition()));
      expect(fens.size).toBeGreaterThan(3);
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
