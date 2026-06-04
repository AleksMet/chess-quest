import {
  computePieceStakeGold,
  stakeIsPossible,
  countWhitePieceInFen,
  removePieceFromFen,
  PIECE_STAKE_CONFIGS,
  BASE_WIN_GOLD,
  BASE_DRAW_GOLD,
  BASE_LOSE_GOLD,
} from '../../src/engine/stakesEngine';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('computePieceStakeGold', () => {
  describe('no stake (multiplier = 1.0)', () => {
    it('win returns BASE_WIN_GOLD', () => {
      expect(computePieceStakeGold('win', 1.0)).toBe(BASE_WIN_GOLD);
    });
    it('draw returns BASE_DRAW_GOLD', () => {
      expect(computePieceStakeGold('draw', 1.0)).toBe(BASE_DRAW_GOLD);
    });
    it('lose returns BASE_LOSE_GOLD', () => {
      expect(computePieceStakeGold('lose', 1.0)).toBe(BASE_LOSE_GOLD);
    });
  });

  describe('knight stake (×2.5)', () => {
    it('win returns BASE_WIN_GOLD × 2.5', () => {
      expect(computePieceStakeGold('win', 2.5)).toBe(Math.round(BASE_WIN_GOLD * 2.5));
    });
    it('draw returns BASE_DRAW_GOLD (piece safe)', () => {
      expect(computePieceStakeGold('draw', 2.5)).toBe(BASE_DRAW_GOLD);
    });
    it('lose returns 0 (piece removed by caller)', () => {
      expect(computePieceStakeGold('lose', 2.5)).toBe(0);
    });
  });

  describe('rook stake (×3.0)', () => {
    it('win returns BASE_WIN_GOLD × 3.0', () => {
      expect(computePieceStakeGold('win', 3.0)).toBe(BASE_WIN_GOLD * 3);
    });
    it('lose returns 0', () => {
      expect(computePieceStakeGold('lose', 3.0)).toBe(0);
    });
  });

  describe('queen stake (×4.0)', () => {
    it('win returns BASE_WIN_GOLD × 4.0', () => {
      expect(computePieceStakeGold('win', 4.0)).toBe(BASE_WIN_GOLD * 4);
    });
    it('lose returns 0', () => {
      expect(computePieceStakeGold('lose', 4.0)).toBe(0);
    });
  });
});

describe('countWhitePieceInFen', () => {
  it('counts 2 knights in starting FEN', () => {
    expect(countWhitePieceInFen(STARTING_FEN, 'n')).toBe(2);
  });
  it('counts 2 rooks in starting FEN', () => {
    expect(countWhitePieceInFen(STARTING_FEN, 'r')).toBe(2);
  });
  it('counts 1 queen in starting FEN', () => {
    expect(countWhitePieceInFen(STARTING_FEN, 'q')).toBe(1);
  });
  it('counts 8 pawns in starting FEN', () => {
    expect(countWhitePieceInFen(STARTING_FEN, 'p')).toBe(8);
  });
  it('falls back to starting FEN when fen is null', () => {
    expect(countWhitePieceInFen(null, 'n')).toBe(2);
  });
  it('returns 0 for a piece that does not exist', () => {
    // Position with no white knights
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    expect(countWhitePieceInFen(fen, 'n')).toBe(0);
  });
});

describe('removePieceFromFen', () => {
  it('removes one white knight from starting FEN', () => {
    const result = removePieceFromFen(STARTING_FEN, 'n');
    expect(countWhitePieceInFen(result, 'n')).toBe(1);
  });
  it('removes one white rook from starting FEN', () => {
    const result = removePieceFromFen(STARTING_FEN, 'r');
    expect(countWhitePieceInFen(result, 'r')).toBe(1);
  });
  it('removes the white queen from starting FEN', () => {
    const result = removePieceFromFen(STARTING_FEN, 'q');
    expect(countWhitePieceInFen(result, 'q')).toBe(0);
  });
  it('returns original FEN if piece not present', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    expect(removePieceFromFen(fen, 'n')).toBe(fen);
  });
  it('falls back to starting FEN when null is passed', () => {
    const result = removePieceFromFen(null, 'n');
    expect(countWhitePieceInFen(result, 'n')).toBe(1);
  });
  it('does not remove black pieces', () => {
    const result = removePieceFromFen(STARTING_FEN, 'n');
    // Black knights should be untouched (still 2)
    const boardPart = result.split(' ')[0];
    const blackKnights = (boardPart.match(/n/g) ?? []).length;
    expect(blackKnights).toBe(2);
  });
});

describe('stakeIsPossible', () => {
  const none   = PIECE_STAKE_CONFIGS.find(c => c.id === 'none')!;
  const knight = PIECE_STAKE_CONFIGS.find(c => c.id === 'knight')!;
  const rook   = PIECE_STAKE_CONFIGS.find(c => c.id === 'rook')!;
  const queen  = PIECE_STAKE_CONFIGS.find(c => c.id === 'queen')!;

  it('"none" is always possible', () => {
    expect(stakeIsPossible(none, null)).toBe(true);
    expect(stakeIsPossible(none, STARTING_FEN)).toBe(true);
  });
  it('knight is possible when knights exist in FEN', () => {
    expect(stakeIsPossible(knight, STARTING_FEN)).toBe(true);
  });
  it('knight is not possible when no knights in FEN', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    expect(stakeIsPossible(knight, fen)).toBe(false);
  });
  it('queen is possible in starting FEN', () => {
    expect(stakeIsPossible(queen, STARTING_FEN)).toBe(true);
  });
  it('queen is not possible after queen removed', () => {
    const noQueenFen = removePieceFromFen(STARTING_FEN, 'q');
    expect(stakeIsPossible(queen, noQueenFen)).toBe(false);
  });
  it('rook is possible in starting FEN', () => {
    expect(stakeIsPossible(rook, STARTING_FEN)).toBe(true);
  });
});

describe('PIECE_STAKE_CONFIGS', () => {
  it('has exactly 4 options', () => {
    expect(PIECE_STAKE_CONFIGS).toHaveLength(4);
  });
  it('ids are none, knight, rook, queen', () => {
    expect(PIECE_STAKE_CONFIGS.map(c => c.id)).toEqual(['none', 'knight', 'rook', 'queen']);
  });
  it('multipliers increase: 1.0 → 2.5 → 3.0 → 4.0', () => {
    const mults = PIECE_STAKE_CONFIGS.map(c => c.multiplier);
    expect(mults).toEqual([1.0, 2.5, 3.0, 4.0]);
  });
});
