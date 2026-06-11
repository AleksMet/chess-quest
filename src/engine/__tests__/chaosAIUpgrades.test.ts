import { Chess } from 'chess.js';
import { applyAIUpgrades, evolvePiece } from '../chaosAIUpgrades';
import type { AIUpgrade } from '../chaosAIUpgrades';

describe('applyAIUpgrades', () => {
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
