import { Chess } from 'chess.js';
import {
  processPlayerMove,
  berserkStreakBonus,
  guardSurvivalBonus,
  isProvocateurThreatened,
} from '../chaosUpgradeEngine';
import type { PieceUpgrade } from '../../types/chaos';

function makeUpgrade(overrides: Partial<PieceUpgrade>): PieceUpgrade {
  return {
    id: 'test_upgrade',
    pieceType: 'p',
    pieceIndex: 0,
    upgradeType: 'sniper',
    category: 'attack',
    turnsOnPosition: 0,
    turnsAlive: 0,
    ...overrides,
  };
}

describe('processPlayerMove', () => {
  it('Снайпер: конь берёт ферзя — ценность жертвы выше — приносит +50 золота', () => {
    const chess = new Chess('k5q1/8/5N2/8/8/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'f6', to: 'g8' })!;
    const upgrades = [makeUpgrade({ id: 'n_0_sniper', pieceType: 'n', upgradeType: 'sniper' })];
    expect(processPlayerMove(move, upgrades, chess, 0)).toEqual([{ upgradeType: 'sniper', bonus: 50 }]);
  });

  it('Снайпер: ферзь берёт пешку — жертва не дороже атакующей фигуры — ничего не срабатывает', () => {
    const chess = new Chess('k7/8/8/3p4/3Q4/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'd4', to: 'd5' })!;
    const upgrades = [makeUpgrade({ id: 'q_0_sniper', pieceType: 'q', upgradeType: 'sniper' })];
    expect(processPlayerMove(move, upgrades, chess, 0)).toEqual([]);
  });

  it('Засада: фигура простояла на месте 3+ хода и берёт оттуда — бонус удваивает золото за взятие', () => {
    const chess = new Chess('k7/8/8/3p4/4P3/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'e4', to: 'd5' })!;
    const upgrades = [makeUpgrade({ id: 'p_0_ambush', pieceType: 'p', upgradeType: 'ambush', category: 'defense', turnsOnPosition: 3 })];
    // Взята пешка (15 золота за взятие) — бонус Засады равен этой же сумме, итог ×2
    expect(processPlayerMove(move, upgrades, chess, 0)).toEqual([{ upgradeType: 'ambush', bonus: 15 }]);
  });

  it('Засада: фигура простояла меньше 3 ходов — бонус не начисляется', () => {
    const chess = new Chess('k7/8/8/3p4/4P3/8/8/7K w - - 0 1');
    const move = chess.move({ from: 'e4', to: 'd5' })!;
    const upgrades = [makeUpgrade({ id: 'p_0_ambush', pieceType: 'p', upgradeType: 'ambush', category: 'defense', turnsOnPosition: 2 })];
    expect(processPlayerMove(move, upgrades, chess, 0)).toEqual([]);
  });

  it('Засада: фигура простояла 3+ хода, но ход без взятия — бонус не начисляется', () => {
    const chess = new Chess();
    const move = chess.move({ from: 'e2', to: 'e4' })!;
    const upgrades = [makeUpgrade({ id: 'p_0_ambush', pieceType: 'p', upgradeType: 'ambush', category: 'defense', turnsOnPosition: 3 })];
    expect(processPlayerMove(move, upgrades, chess, 0)).toEqual([]);
  });
});

describe('berserkStreakBonus', () => {
  it('серия 1 → +30 золота', () => {
    expect(berserkStreakBonus(1)).toBe(30);
  });

  it('серия 2 → +35 золота', () => {
    expect(berserkStreakBonus(2)).toBe(35);
  });

  it('серия 3 → +40 золота', () => {
    expect(berserkStreakBonus(3)).toBe(40);
  });

  it('серия 4 → +50 золота', () => {
    expect(berserkStreakBonus(4)).toBe(50);
  });

  it('серия 6 и выше → всегда +60 золота', () => {
    expect(berserkStreakBonus(6)).toBe(60);
    expect(berserkStreakBonus(10)).toBe(60);
  });

  it('серия 0 (сброс) → бонуса нет', () => {
    expect(berserkStreakBonus(0)).toBe(0);
  });
});

describe('guardSurvivalBonus', () => {
  it('guard I: каждые 5 ходов выживания приносят +14 золота', () => {
    expect(guardSurvivalBonus('guard', 5)).toBe(14);
    expect(guardSurvivalBonus('guard', 10)).toBe(14);
  });

  it('guard I: между порогами бонус не начисляется', () => {
    expect(guardSurvivalBonus('guard', 1)).toBe(0);
    expect(guardSurvivalBonus('guard', 4)).toBe(0);
    expect(guardSurvivalBonus('guard', 6)).toBe(0);
  });

  it('guard I: 0 ходов — бонуса нет', () => {
    expect(guardSurvivalBonus('guard', 0)).toBe(0);
  });

  it('guard II: срабатывает каждые 4 хода, бонус выше', () => {
    expect(guardSurvivalBonus('guard_2', 4)).toBe(18);
    expect(guardSurvivalBonus('guard_2', 5)).toBe(0);
  });

  it('guard III: срабатывает каждые 3 хода, максимальный бонус', () => {
    expect(guardSurvivalBonus('guard_3', 3)).toBe(25);
    expect(guardSurvivalBonus('guard_3', 4)).toBe(0);
  });
});

describe('isProvocateurThreatened', () => {
  it('фигура под атакой чёрных — возвращает true', () => {
    const chess = new Chess('k7/8/8/4N3/3q4/8/8/7K w - - 0 1');
    expect(isProvocateurThreatened(chess, 'e5')).toBe(true);
  });

  it('фигура не под атакой чёрных — возвращает false', () => {
    const chess = new Chess('k7/8/8/8/3q4/8/4N3/7K w - - 0 1');
    expect(isProvocateurThreatened(chess, 'e2')).toBe(false);
  });
});
