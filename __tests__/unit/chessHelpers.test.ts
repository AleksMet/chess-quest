import { Chess } from 'chess.js';
import { detectFork, detectPin } from '../../src/utils/chessHelpers';

describe('chessHelpers', () => {
  describe('detectFork', () => {
    it('knight attacking queen and rook is a fork', () => {
      // WN d3, BQ d7, BR g6, WK h1, BK a8
      const chess = new Chess('k7/3q4/6r1/8/8/3N4/8/7K w - - 0 1');
      const move = chess.move({ from: 'd3', to: 'e5' });
      const result = detectFork(chess, move!);
      expect(result.isFork).toBe(true);
      expect(result.attackedPieces.length).toBeGreaterThanOrEqual(2);
    });

    it('knight attacking one piece is not a fork', () => {
      // WN d3, BQ d7 only, WK h1, BK a8
      const chess = new Chess('k7/3q4/8/8/8/3N4/8/7K w - - 0 1');
      const move = chess.move({ from: 'd3', to: 'e5' });
      const result = detectFork(chess, move!);
      expect(result.isFork).toBe(false);
    });

    it('bishop attacking two pieces diagonally is a fork', () => {
      // WB d4 → e5, BQ c7, BR g7, WK h1, BK a8
      const chess = new Chess('k7/2q3r1/8/8/3B4/8/8/7K w - - 0 1');
      const move = chess.move({ from: 'd4', to: 'e5' });
      const result = detectFork(chess, move!);
      expect(result.isFork).toBe(true);
    });

    it('fork that includes the king counts', () => {
      // WN d3 → e5, BK f7, BR g6, WK h1
      const chess = new Chess('8/5k2/6r1/8/8/3N4/8/7K w - - 0 1');
      const move = chess.move({ from: 'd3', to: 'e5' });
      const result = detectFork(chess, move!);
      expect(result.isFork).toBe(true);
    });

    it('no opponent pieces on attacked squares means no fork', () => {
      // WN d3 → e5, BK a8 (not on any knight-attack square from e5), WK h1
      const chess = new Chess('k7/8/8/8/8/3N4/8/7K w - - 0 1');
      const move = chess.move({ from: 'd3', to: 'e5' });
      const result = detectFork(chess, move!);
      expect(result.isFork).toBe(false);
    });
  });

  describe('detectPin', () => {
    it('bishop pins knight before king', () => {
      // WB b3 → c4, BN d5, BK g8, WK h1
      const chess = new Chess('6k1/8/8/3n4/8/1B6/8/7K w - - 0 1');
      const move = chess.move({ from: 'b3', to: 'c4' });
      const result = detectPin(chess, move!);
      expect(result.isPin).toBe(true);
    });

    it('rook pins piece before king', () => {
      // WR a1 → a5, BN f5, BK h5, WK h1
      const chess = new Chess('8/8/8/5n1k/8/8/8/R6K w - - 0 1');
      const move = chess.move({ from: 'a1', to: 'a5' });
      const result = detectPin(chess, move!);
      expect(result.isPin).toBe(true);
    });

    it('queen creates a relative pin with opponent queen behind', () => {
      // WQ c3 → a1, BN d4, BQ g7, BK a8, WK h1
      const chess = new Chess('k7/6q1/8/8/3n4/2Q5/8/7K w - - 0 1');
      const move = chess.move({ from: 'c3', to: 'a1' });
      const result = detectPin(chess, move!);
      expect(result.isPin).toBe(true);
    });

    it('piece not on the attack line is not a pin', () => {
      // WB b3 → c4, BN e6, BK a8 (king not behind the knight from c4)
      const chess = new Chess('k7/8/4n3/8/8/1B6/8/7K w - - 0 1');
      const move = chess.move({ from: 'b3', to: 'c4' });
      const result = detectPin(chess, move!);
      expect(result.isPin).toBe(false);
    });

    it('detects absolute pin where king is the valuable piece behind', () => {
      // WR c1 → c5, BN c7, BK c8, WK h1
      const chess = new Chess('2k5/2n5/8/8/8/8/8/2R4K w - - 0 1');
      const move = chess.move({ from: 'c1', to: 'c5' });
      const result = detectPin(chess, move!);
      expect(result.isPin).toBe(true);
      expect(result.valuablePieceSquare).toBe('c8');
    });
  });
});
