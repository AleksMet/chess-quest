import { Chess } from 'chess.js';
import { buildChaosFen, resolveArmyAfterBattle } from '../chaosBattle';
import type { ChessPiece } from '../../store/chaosModeStore';

const STARTING_PIECES: ChessPiece[] = ['k', 'p', 'p', 'p', 'p'];
const FULL_ARMY: ChessPiece[] = ['k', 'q', 'r', 'r', 'b', 'b', 'n', 'n', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'];

describe('buildChaosFen', () => {
  const battles = [1, 2, 3, 'boss'] as const;

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

  it('battle 3 AI army matches GDD spec: king + 6 pawns + 2 knights + 2 bishops + rook', () => {
    const fen = buildChaosFen(STARTING_PIECES, 3);
    const board = fen.split(' ')[0];
    expect((board.match(/n/g) ?? []).length).toBe(2);
    expect((board.match(/b/g) ?? []).length).toBe(2);
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
