import {
  shouldTriggerEvent,
  rollChaosEvent,
  findStrongestPieceId,
  pickAmbushVictim,
  pickTraitorVictimId,
  parsePieceId,
  describeAiBattle,
} from '../chaosEventEngine';
import type { PieceUpgrade } from '../../types/chaos';
import type { ChessPiece } from '../../store/chaosModeStore';
import { CHAOS_EVENTS } from '../../data/chaosEvents';

const NO_UPGRADES: PieceUpgrade[] = [];

const BASE_CTX = {
  lastEventWasNegative: false,
  pieces: ['k', 'r', 'r', 'p', 'p', 'p', 'p'] as ChessPiece[],
  gold: 150,
  pieceUpgrades: NO_UPGRADES,
};

describe('shouldTriggerEvent', () => {
  it('возвращает boolean', () => {
    const result = shouldTriggerEvent();
    expect(typeof result).toBe('boolean');
  });

  it('при псевдорандоме 0.5 (< 0.6) — срабатывает', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(shouldTriggerEvent()).toBe(true);
    jest.restoreAllMocks();
  });

  it('при псевдорандоме 0.7 (> 0.6) — не срабатывает', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.7);
    expect(shouldTriggerEvent()).toBe(false);
    jest.restoreAllMocks();
  });
});

describe('rollChaosEvent', () => {
  it('возвращает корректный eventId из известного списка', () => {
    const KNOWN_IDS = [
      'old_blacksmith', 'deserter', 'war_loot', 'secret_arsenal',
      'relic_trader', 'alchemist', 'fortune_teller', 'recruiter',
      'enemy_ambush', 'traitor', 'treasury_fire', 'curse',
    ];
    for (let i = 0; i < 20; i++) {
      expect(KNOWN_IDS).toContain(rollChaosEvent(BASE_CTX));
    }
  });

  it('после отрицательного события — не выбирает отрицательную категорию', () => {
    const negativeIds = new Set(CHAOS_EVENTS.filter(e => e.category === 'negative').map(e => e.id));
    const ctx = { ...BASE_CTX, lastEventWasNegative: true };

    for (let i = 0; i < 50; i++) {
      expect(negativeIds.has(rollChaosEvent(ctx))).toBe(false);
    }
  });

  it('при армии ≤ 2 фигур (не считая короля=1) — не выбирает отрицательную категорию', () => {
    const negativeIds = new Set(['enemy_ambush', 'traitor', 'treasury_fire', 'curse']);
    // армия: только король + 1 фигура = 2 фигуры (≤ 2 не-короля = 1, граница)
    const ctx = { ...BASE_CTX, pieces: ['k', 'p'] as ChessPiece[] };

    for (let i = 0; i < 50; i++) {
      expect(negativeIds.has(rollChaosEvent(ctx))).toBe(false);
    }
  });

  it('без золота — treasury_fire не выпадает', () => {
    const ctx = { ...BASE_CTX, gold: 20 }; // < 50
    for (let i = 0; i < 50; i++) {
      expect(rollChaosEvent(ctx)).not.toBe('treasury_fire');
    }
  });

  it('без ладьи — relic_trader не выпадает', () => {
    const ctx = { ...BASE_CTX, pieces: ['k', 'n', 'p', 'p'] as ChessPiece[] };
    for (let i = 0; i < 50; i++) {
      expect(rollChaosEvent(ctx)).not.toBe('relic_trader');
    }
  });
});

describe('findStrongestPieceId', () => {
  it('возвращает ферзя как сильнейшую фигуру', () => {
    expect(findStrongestPieceId(['k', 'q', 'r', 'p'])).toBe('q_0');
  });

  it('возвращает ладью если нет ферзя', () => {
    expect(findStrongestPieceId(['k', 'r', 'b', 'p'])).toBe('r_0');
  });

  it('для армии только из короля — возвращает null', () => {
    expect(findStrongestPieceId(['k'])).toBeNull();
  });

  it('для двух ладей — возвращает r_0 (первую)', () => {
    expect(findStrongestPieceId(['k', 'r', 'r', 'p'])).toBe('r_0');
  });
});

describe('pickAmbushVictim', () => {
  it('не выбирает короля', () => {
    const result = pickAmbushVictim(['k'], NO_UPGRADES);
    expect(result).toBeNull();
  });

  it('предпочитает фигуры без улучшений', () => {
    const upgrades: PieceUpgrade[] = [{
      id: 'p_0_berserk', pieceType: 'p', pieceIndex: 0,
      upgradeType: 'berserk', category: 'attack', turnsOnPosition: 0, turnsAlive: 0,
    }];
    // Армия: п.0 с улучшением, п.1 без — жертва п.1
    const pieces: ChessPiece[] = ['k', 'p', 'p'];
    const result = pickAmbushVictim(pieces, upgrades);
    expect(result).toBe('p_1');
  });

  it('выбирает пешку раньше ладьи (наименьшая ценность)', () => {
    const pieces: ChessPiece[] = ['k', 'r', 'p'];
    const result = pickAmbushVictim(pieces, NO_UPGRADES);
    expect(result).toBe('p_0');
  });
});

describe('pickTraitorVictimId', () => {
  it('возвращает null если все фигуры улучшены', () => {
    const upgrades: PieceUpgrade[] = [{
      id: 'p_0_berserk', pieceType: 'p', pieceIndex: 0,
      upgradeType: 'berserk', category: 'attack', turnsOnPosition: 0, turnsAlive: 0,
    }];
    const pieces: ChessPiece[] = ['k', 'p'];
    expect(pickTraitorVictimId(pieces, upgrades)).toBeNull();
  });

  it('возвращает фигуру без улучшений', () => {
    const pieces: ChessPiece[] = ['k', 'r', 'p'];
    const result = pickTraitorVictimId(pieces, NO_UPGRADES);
    expect(['r_0', 'p_0']).toContain(result);
  });
});

describe('parsePieceId', () => {
  it('парсит r_0 корректно', () => {
    expect(parsePieceId('r_0')).toEqual({ pieceType: 'r', pieceIndex: 0 });
  });

  it('парсит n_1 корректно', () => {
    expect(parsePieceId('n_1')).toEqual({ pieceType: 'n', pieceIndex: 1 });
  });
});

describe('describeAiBattle', () => {
  it('описывает бой 1', () => {
    expect(describeAiBattle(1)).toContain('Ладья');
  });

  it('описывает босса', () => {
    expect(describeAiBattle('boss')).toContain('Ферзя');
  });
});
