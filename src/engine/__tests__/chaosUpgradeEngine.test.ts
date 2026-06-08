import { Chess } from 'chess.js';
import { processPlayerMove } from '../chaosUpgradeEngine';
import type { PieceUpgrade } from '../../types/chaos';

function makeUpgrade(overrides: Partial<PieceUpgrade>): PieceUpgrade {
  return {
    id: 'test_upgrade',
    pieceType: 'p',
    pieceIndex: 0,
    upgradeType: 'greedy',
    category: 'attack',
    turnsOnPosition: 0,
    ...overrides,
  };
}

describe('processPlayerMove', () => {
  it('Жадный: взятие фигурой с улучшением greedy приносит +20 золота', () => {
    const chess = new Chess('k7/8/8/3p4/4P3/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'e4', to: 'd5' })!;
    const upgrades = [makeUpgrade({ id: 'p_0_greedy', pieceType: 'p', upgradeType: 'greedy' })];
    expect(processPlayerMove(move, upgrades)).toEqual([{ upgradeType: 'greedy', bonus: 20 }]);
  });

  it('Берсерк: взятие фигурой с улучшением berserk приносит +30 золота', () => {
    const chess = new Chess('k7/8/8/3p4/4P3/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'e4', to: 'd5' })!;
    const upgrades = [makeUpgrade({ id: 'p_0_berserk', pieceType: 'p', upgradeType: 'berserk', category: 'attack' })];
    expect(processPlayerMove(move, upgrades)).toEqual([{ upgradeType: 'berserk', bonus: 30 }]);
  });

  it('Снайпер: конь берёт ферзя — ценность жертвы выше — приносит +50 золота', () => {
    const chess = new Chess('k5q1/8/5N2/8/8/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'f6', to: 'g8' })!;
    const upgrades = [makeUpgrade({ id: 'n_0_sniper', pieceType: 'n', upgradeType: 'sniper' })];
    expect(processPlayerMove(move, upgrades)).toEqual([{ upgradeType: 'sniper', bonus: 50 }]);
  });

  it('Снайпер: ферзь берёт пешку — жертва не дороже атакующей фигуры — ничего не срабатывает', () => {
    const chess = new Chess('k7/8/8/3p4/3Q4/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'd4', to: 'd5' })!;
    const upgrades = [makeUpgrade({ id: 'q_0_sniper', pieceType: 'q', upgradeType: 'sniper' })];
    expect(processPlayerMove(move, upgrades)).toEqual([]);
  });

  it('Крепость: фигура простояла на месте 3+ хода — приносит +10 золота', () => {
    const chess = new Chess();
    const move = chess.move({ from: 'e2', to: 'e4' })!;
    const upgrades = [makeUpgrade({ id: 'b_0_fortress', pieceType: 'b', upgradeType: 'fortress', category: 'defense', turnsOnPosition: 3 })];
    expect(processPlayerMove(move, upgrades)).toEqual([{ upgradeType: 'fortress', bonus: 10 }]);
  });
});
