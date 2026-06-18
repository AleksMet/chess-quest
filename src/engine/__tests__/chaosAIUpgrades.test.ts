import { Chess } from 'chess.js';
import { applyAIUpgrades, evolvePiece, teleportAttackingPieces } from '../chaosAIUpgrades';
import type { AIUpgrade } from '../chaosAIUpgrades';

// TODO: mechanics-v3 — стандартные улучшения AI убраны, тесты отключены
describe.skip('applyAIUpgrades', () => {
  it('Берсерк: есть взятие — берёт', () => {
    const chess = new Chess('7k/8/3P4/8/2n5/8/8/K7 b - - 0 1');
    const upgrades: AIUpgrade[] = [{ pieceType: 'n', upgradeType: 'berserk' }];
    expect(applyAIUpgrades(chess, 'c4a5', upgrades)).toBe('c4d6');
  });

  it('Берсерк: нет взятия — ход Stockfish', () => {
    const chess = new Chess('7k/8/8/8/2n5/8/8/K7 b - - 0 1');
    const upgrades: AIUpgrade[] = [{ pieceType: 'n', upgradeType: 'berserk' }];
    expect(applyAIUpgrades(chess, 'c4a5', upgrades)).toBe('c4a5');
  });

  it('Снайпер: конь может взять ферзя — берёт', () => {
    const chess = new Chess('7k/8/3Q4/8/2n5/8/8/K7 b - - 0 1');
    const upgrades: AIUpgrade[] = [{ pieceType: 'n', upgradeType: 'sniper' }];
    expect(applyAIUpgrades(chess, 'c4a5', upgrades)).toBe('c4d6');
  });

  it('Снайпер: конь может взять только пешку — ход Stockfish', () => {
    const chess = new Chess('7k/8/3P4/8/2n5/8/8/K7 b - - 0 1');
    const upgrades: AIUpgrade[] = [{ pieceType: 'n', upgradeType: 'sniper' }];
    expect(applyAIUpgrades(chess, 'c4a5', upgrades)).toBe('c4a5');
  });

  it('Страж: король под шахом, атакующая не защищена — Страж берёт', () => {
    // Чёрный король e8 под шахом ладьи e1 (не защищена белым королём g1).
    // Чёрная ладья a1 может взять e1; чёрная ладья h4 может блокировать на e4 — это ход Stockfish.
    const chess = new Chess('4k3/8/8/8/7r/8/8/r3R1K1 b - - 0 1');
    const upgrades: AIUpgrade[] = [{ pieceType: 'r', upgradeType: 'guard' }];
    expect(applyAIUpgrades(chess, 'h4e4', upgrades)).toBe('a1e1');
  });

  it('Страж: держится в радиусе 2 клеток от короля', () => {
    // Чёрная ладья e6 (дистанция 2 от короля e8). Stockfish уводит её на e1 (дистанция 6),
    // но e7 (дистанция 1) ближе и доступна — Страж выбирает её.
    const chess = new Chess('4k3/8/4r3/8/8/8/8/K7 b - - 0 1');
    const upgrades: AIUpgrade[] = [{ pieceType: 'r', upgradeType: 'guard' }];
    expect(applyAIUpgrades(chess, 'e6e1', upgrades)).toBe('e6e7');
  });
});

describe('evolvePiece', () => {
  it('Пешка эволюционирует в коня или слона', () => {
    const chess = new Chess('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');
    const evolved = evolvePiece(chess, 3);
    expect(evolved).not.toBeNull();
    expect(evolved!.get('e7')?.color).toBe('b');
    expect(['n', 'b']).toContain(evolved!.get('e7')?.type);
  });

  it('Конь эволюционирует в ладью', () => {
    const chess = new Chess('4k3/8/4n3/8/8/8/8/4K3 b - - 0 1');
    const evolved = evolvePiece(chess, 3);
    expect(evolved).not.toBeNull();
    expect(evolved!.get('e6')).toEqual({ type: 'r', color: 'b' });
  });

  it('Слон эволюционирует в ладью', () => {
    const chess = new Chess('4k3/8/4b3/8/8/8/8/4K3 b - - 0 1');
    const evolved = evolvePiece(chess, 3);
    expect(evolved).not.toBeNull();
    expect(evolved!.get('e6')).toEqual({ type: 'r', color: 'b' });
  });

  it('Ладья эволюционирует в ферзя (лимит не достигнут)', () => {
    const chess = new Chess('4k3/8/4r3/8/8/8/8/4K3 b - - 0 1');
    const evolved = evolvePiece(chess, 3);
    expect(evolved).not.toBeNull();
    expect(evolved!.get('e6')).toEqual({ type: 'q', color: 'b' });
  });

  it('При лимите ферзей — ладья остаётся, эволюционирует другая фигура', () => {
    // Уже 1 ферзь, лимит 1 — ладья e6 не может стать ферзём, эволюционирует конь g6
    const chess = new Chess('4k3/8/4r1n1/8/8/4q3/8/4K3 b - - 0 1');
    const evolved = evolvePiece(chess, 1);
    expect(evolved).not.toBeNull();
    expect(evolved!.get('e6')).toEqual({ type: 'r', color: 'b' });
    expect(evolved!.get('e3')).toEqual({ type: 'q', color: 'b' });
    expect(evolved!.get('g6')).toEqual({ type: 'r', color: 'b' });
  });

  it('Ферзь и король не эволюционируют', () => {
    const chess = new Chess('4k3/8/8/8/8/8/8/4K2q b - - 0 1');
    expect(evolvePiece(chess, 3)).toBeNull();
  });
});

describe('teleportAttackingPieces', () => {
  // Слон b1 и конь g1 чёрных — атакующие фигуры, ферзь d8 и король e8 исключены
  const ATTACKER_FEN = '3qk3/8/8/8/8/8/8/1b2K1n1 b - - 0 1';

  it('телепортирует атакующие фигуры на ряды 5-8', () => {
    const chess = new Chess(ATTACKER_FEN);
    const result = teleportAttackingPieces(chess, ['b', 'n'], ['k', 'q']);

    expect(result.get('b1')).toBeUndefined();
    expect(result.get('g1')).toBeUndefined();

    const blackBishops = result.board().flat().filter(c => c?.type === 'b' && c?.color === 'b');
    const blackKnights = result.board().flat().filter(c => c?.type === 'n' && c?.color === 'b');
    expect(blackBishops).toHaveLength(1);
    expect(blackKnights).toHaveLength(1);
    expect(blackBishops[0]!.square[1]).toMatch(/[5-8]/);
    expect(blackKnights[0]!.square[1]).toMatch(/[5-8]/);
  });

  it('король и страж-ферзь остаются на месте', () => {
    const chess = new Chess(ATTACKER_FEN);
    const result = teleportAttackingPieces(chess, ['b', 'n'], ['k', 'q']);

    expect(result.get('e8')).toEqual({ type: 'k', color: 'b' });
    expect(result.get('d8')).toEqual({ type: 'q', color: 'b' });
  });

  it('если нет свободных клеток — фигуры не телепортируются', () => {
    const fen = 'rrrrrrrr/rrrrrrrr/rrrrrrrr/rrrrrrrr/1b2K1n1/8/8/4k3 b - - 0 1';
    const chess = new Chess(fen);
    const result = teleportAttackingPieces(chess, ['b', 'n'], ['k', 'q']);

    expect(result.fen()).toBe(chess.fen());
  });

  it('FEN после телепортации валиден', () => {
    const chess = new Chess(ATTACKER_FEN);
    const result = teleportAttackingPieces(chess, ['b', 'n'], ['k', 'q']);

    expect(() => new Chess(result.fen())).not.toThrow();
  });
});
