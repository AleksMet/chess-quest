import { Chess } from 'chess.js';
import { buildBossFen } from '../../src/engine/chessHelpers';

const STANDARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('buildBossFen', () => {
  it('returns standard FEN when currentFen is null', () => {
    expect(buildBossFen(null)).toBe(STANDARD_FEN);
  });

  it('returns a valid FEN (parseable by chess.js)', () => {
    const fen = buildBossFen(STANDARD_FEN);
    expect(() => new Chess(fen)).not.toThrow();
  });

  it('white king is always on e1', () => {
    const fen = buildBossFen(STANDARD_FEN);
    const chess = new Chess(fen);
    const king = chess.get('e1');
    expect(king?.type).toBe('k');
    expect(king?.color).toBe('w');
  });

  it('black keeps full standard complement (16 pieces)', () => {
    const fen = buildBossFen(STANDARD_FEN);
    const chess = new Chess(fen);
    const board = chess.board();
    let blackCount = 0;
    for (const row of board) {
      for (const sq of row) {
        if (sq?.color === 'b') blackCount++;
      }
    }
    expect(blackCount).toBe(16);
  });

  it('white pieces placed match count in source FEN (full set → 16)', () => {
    const fen = buildBossFen(STANDARD_FEN);
    const chess = new Chess(fen);
    const board = chess.board();
    let whiteCount = 0;
    for (const row of board) {
      for (const sq of row) {
        if (sq?.color === 'w') whiteCount++;
      }
    }
    expect(whiteCount).toBe(16);
  });

  it('white with only king + 3 pawns in source produces correct count', () => {
    // King on e1, 3 pawns on a2/b2/c2 — FEN: 8/8/8/8/8/8/PPP5/4K3 w - - 0 1
    const sparseFen = '8/8/8/8/8/8/PPP5/4K3 w - - 0 1';
    const fen = buildBossFen(sparseFen);
    const chess = new Chess(fen);
    const board = chess.board();
    let whiteCount = 0;
    for (const row of board) {
      for (const sq of row) {
        if (sq?.color === 'w') whiteCount++;
      }
    }
    // 1 King + 3 Pawns = 4
    expect(whiteCount).toBe(4);
  });

  it('king always on e1 regardless of source FEN', () => {
    const midgameFen = 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7';
    const fen = buildBossFen(midgameFen);
    const chess = new Chess(fen);
    const king = chess.get('e1');
    expect(king?.type).toBe('k');
    expect(king?.color).toBe('w');
  });

  it('no king in check at start', () => {
    const fen = buildBossFen(STANDARD_FEN);
    const chess = new Chess(fen);
    expect(chess.isCheck()).toBe(false);
  });

  it('returns valid FEN even for minimal/sparse source', () => {
    // Garbage string has no recognisable pieces → only king is placed
    const result = buildBossFen('not_a_valid_fen !!!!!');
    expect(() => new Chess(result)).not.toThrow();
    // White king must still be on e1
    const chess = new Chess(result);
    const king = chess.get('e1');
    expect(king?.color).toBe('w');
    expect(king?.type).toBe('k');
  });
});
