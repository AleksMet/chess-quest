import { Chess } from 'chess.js';
import { buildChaosFen, buildLevel2AiFen, resolveArmyAfterBattle, spawnKnightOnKingMove } from '../chaosBattle';
import type { ChessPiece } from '../../store/chaosModeStore';
import { LEVEL_CONFIGS } from '../../data/chaosLevelConfig';

const STARTING_PIECES: ChessPiece[] = ['k', 'p', 'p', 'p', 'p'];
const FULL_ARMY: ChessPiece[] = ['k', 'q', 'r', 'r', 'b', 'b', 'n', 'n', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'];

describe('buildChaosFen', () => {
  const battles = [1, 2, 'boss'] as const;

  it.each(battles)('produces a valid FEN with white to move for battle %s (starting army)', (battleNumber) => {
    const fen = buildChaosFen(STARTING_PIECES, battleNumber);
    expect(() => new Chess(fen)).not.toThrow();
    const chess = new Chess(fen);
    expect(chess.turn()).toBe('w');
  });

  it.each(battles)('produces a valid FEN for a fully equipped army in battle %s', (battleNumber) => {
    const fen = buildChaosFen(FULL_ARMY, battleNumber);
    expect(() => new Chess(fen)).not.toThrow();
  });

  it('places the player army on the white side exactly as bought', () => {
    const fen = buildChaosFen(STARTING_PIECES, 1);
    const board = fen.split(' ')[0];
    expect((board.match(/K/g) ?? []).length).toBe(1);
    expect((board.match(/P/g) ?? []).length).toBe(4);
    expect((board.match(/Q/g) ?? []).length).toBe(0);
  });

  it('places a fully equipped army with one of each major/minor piece (capped at limits)', () => {
    const fen = buildChaosFen(FULL_ARMY, 1);
    const board = fen.split(' ')[0];
    expect((board.match(/K/g) ?? []).length).toBe(1);
    expect((board.match(/Q/g) ?? []).length).toBe(1);
    expect((board.match(/R/g) ?? []).length).toBe(2);
    expect((board.match(/B/g) ?? []).length).toBe(2);
    expect((board.match(/N/g) ?? []).length).toBe(2);
    expect((board.match(/P/g) ?? []).length).toBe(8);
  });

  it('battle 1 AI army matches GDD spec: king + 6 pawns + knight + bishop + rook', () => {
    const fen = buildChaosFen(STARTING_PIECES, 1);
    const board = fen.split(' ')[0];
    expect((board.match(/k/g) ?? []).length).toBe(1);
    expect((board.match(/p/g) ?? []).length).toBe(6);
    expect((board.match(/n/g) ?? []).length).toBe(1);
    expect((board.match(/b/g) ?? []).length).toBe(1);
    expect((board.match(/r/g) ?? []).length).toBe(1);
    expect((board.match(/q/g) ?? []).length).toBe(0);
  });

  it('battle 2 AI army matches GDD spec: king + 6 pawns + 2 knights + bishop + rook', () => {
    const fen = buildChaosFen(STARTING_PIECES, 2);
    const board = fen.split(' ')[0];
    expect((board.match(/n/g) ?? []).length).toBe(2);
    expect((board.match(/b/g) ?? []).length).toBe(1);
    expect((board.match(/r/g) ?? []).length).toBe(1);
  });

  it('boss AI army matches GDD spec: king + 8 pawns + 2 queens + 2 rooks + knight', () => {
    const fen = buildChaosFen(STARTING_PIECES, 'boss');
    const board = fen.split(' ')[0];
    expect((board.match(/k/g) ?? []).length).toBe(1);
    expect((board.match(/p/g) ?? []).length).toBe(8);
    expect((board.match(/q/g) ?? []).length).toBe(2);
    expect((board.match(/r/g) ?? []).length).toBe(2);
    expect((board.match(/n/g) ?? []).length).toBe(1);
  });

  it('boss has an extra queen advanced to d6', () => {
    const fen = buildChaosFen(STARTING_PIECES, 'boss');
    const chess = new Chess(fen);
    expect(chess.get('d6')?.type).toBe('q');
    expect(chess.get('d6')?.color).toBe('b');
    expect(chess.get('d8')?.type).toBe('q');
  });

  it('always keeps exactly one king per side regardless of army composition', () => {
    for (const battleNumber of battles) {
      const fen = buildChaosFen(FULL_ARMY, battleNumber);
      const board = fen.split(' ')[0];
      expect((board.match(/K/g) ?? []).length).toBe(1);
      expect((board.match(/k/g) ?? []).length).toBe(1);
    }
  });

  // Король ИИ не должен получать мат первым же ходом игрока — иначе бой завершается
  // до того, как успевает начаться. Самый частый случай: 2 ладьи игрока бьют по
  // открытой линии «h» прямо на пустое h8 (Rh8#), если на 8-й горизонтали ИИ нет фигуры-блокера.
  function isMateInOne(fen: string): boolean {
    const chess = new Chess(fen);
    for (const move of chess.moves({ verbose: true })) {
      chess.move(move);
      const mate = chess.isCheckmate();
      chess.undo();
      if (mate) return true;
    }
    return false;
  }

  const TWO_ROOKS_ARMY: ChessPiece[] = ['k', 'r', 'r', 'p', 'p', 'p', 'p'];

  it.each(battles)('never allows mate-in-one for the starting army in battle %s', (battleNumber) => {
    expect(isMateInOne(buildChaosFen(STARTING_PIECES, battleNumber))).toBe(false);
  });

  it.each(battles)('never allows mate-in-one for a fully equipped army in battle %s', (battleNumber) => {
    expect(isMateInOne(buildChaosFen(FULL_ARMY, battleNumber))).toBe(false);
  });

  it.each(battles)('never allows mate-in-one for a two-rook army with an open h-file in battle %s', (battleNumber) => {
    expect(isMateInOne(buildChaosFen(TWO_ROOKS_ARMY, battleNumber))).toBe(false);
  });
});

describe('buildLevel2AiFen', () => {
  const level2 = LEVEL_CONFIGS[1];
  const allBattleConfigs = [...level2.battles, level2.eliteBattle, level2.bossConfig];

  it.each(allBattleConfigs.map((c, i) => [i, c.aiUpgrades] as const))(
    'produces a valid FEN with white to move for battle config %i',
    (_i, aiUpgrades) => {
      const fen = buildLevel2AiFen(STARTING_PIECES, aiUpgrades);
      expect(() => new Chess(fen)).not.toThrow();
      const chess = new Chess(fen);
      expect(chess.turn()).toBe('w');
    }
  );

  it('places a piece for each AI upgrade on the board', () => {
    const fen = buildLevel2AiFen(STARTING_PIECES, level2.bossConfig.aiUpgrades);
    const chess = new Chess(fen);
    const board = chess.board().flat().filter(c => c && c.color === 'b');
    // 2x knight (берсерк), слон (снайпер), ферзь (страж) + король + 6 пешек
    expect(board.filter(c => c?.type === 'n')).toHaveLength(2);
    expect(board.filter(c => c?.type === 'b')).toHaveLength(1);
    expect(board.filter(c => c?.type === 'q')).toHaveLength(1);
  });
});

describe('resolveArmyAfterBattle', () => {
  it('a pawn promoted to queen during the battle returns to the army as a pawn', () => {
    const fen = '4k3/8/8/8/8/8/8/4K2Q w - - 0 1';
    const purchased: ChessPiece[] = ['k', 'p'];
    const result = resolveArmyAfterBattle(fen, purchased);
    expect([...result].sort()).toEqual(['k', 'p']);
  });

  it('a purchased queen that survived the battle remains a queen', () => {
    const fen = '4k3/8/8/8/8/8/8/3QK3 w - - 0 1';
    const purchased: ChessPiece[] = ['k', 'q'];
    const result = resolveArmyAfterBattle(fen, purchased);
    expect([...result].sort()).toEqual(['k', 'q']);
  });

  it('a purchased queen that died in battle does not carry over', () => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const purchased: ChessPiece[] = ['k', 'q'];
    const result = resolveArmyAfterBattle(fen, purchased);
    expect(result).not.toContain('q');
    expect([...result].sort()).toEqual(['k']);
  });

  it('ordinary surviving pieces carry over to the next battle as-is', () => {
    const fen = '4k3/8/8/8/8/8/8/RNB1K3 w - - 0 1';
    const purchased: ChessPiece[] = ['k', 'r', 'n', 'b'];
    const result = resolveArmyAfterBattle(fen, purchased);
    expect([...result].sort()).toEqual(['b', 'k', 'n', 'r']);
  });
});

describe('spawnKnightOnKingMove', () => {
  it('places a black knight on an empty square in ranks 5-8 after a black king move', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/4K3 b - - 0 1');
    const square = spawnKnightOnKingMove(chess, { piece: 'k', color: 'b' });

    expect(square).not.toBeNull();
    expect(square![1]).toMatch(/[5-8]/);
    expect(chess.get(square!)).toEqual({ type: 'n', color: 'b' });
  });

  it('does nothing for moves by pieces other than the king', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/4K3 b - - 0 1');
    const before = chess.fen();
    const square = spawnKnightOnKingMove(chess, { piece: 'q', color: 'b' });

    expect(square).toBeNull();
    expect(chess.fen()).toBe(before);
  });

  it('does nothing for a white king move', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const before = chess.fen();
    const square = spawnKnightOnKingMove(chess, { piece: 'k', color: 'w' });

    expect(square).toBeNull();
    expect(chess.fen()).toBe(before);
  });

  it('returns null when ranks 5-8 are completely full', () => {
    const fen = 'rrrrrrrr/rrrrrrrr/rrrrrrrr/rrrrrrrr/4k3/8/8/4K3 b - - 0 1';
    const chess = new Chess(fen);
    const square = spawnKnightOnKingMove(chess, { piece: 'k', color: 'b' });

    expect(square).toBeNull();
  });
});
