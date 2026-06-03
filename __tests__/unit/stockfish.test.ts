import {
  eloToSkillLevel,
  parseBestMove,
  getRandomLegalMove,
  createStockfishEngine,
} from '../../src/engine/stockfish';

describe('stockfish', () => {
  describe('eloToSkillLevel', () => {
    it('maps 400 ELO to skill level 1', () => {
      expect(eloToSkillLevel(400)).toBe(1);
    });

    it('maps 2200 ELO to skill level 20', () => {
      expect(eloToSkillLevel(2200)).toBe(20);
    });

    it('clamps below 400 to skill level 1', () => {
      expect(eloToSkillLevel(100)).toBe(1);
    });

    it('clamps above 2200 to skill level 20', () => {
      expect(eloToSkillLevel(3000)).toBe(20);
    });

    it('maps mid-range ELO correctly', () => {
      const level = eloToSkillLevel(1300);
      expect(level).toBeGreaterThan(1);
      expect(level).toBeLessThan(20);
    });
  });

  describe('parseBestMove', () => {
    it('parses a simple bestmove response', () => {
      const result = parseBestMove('bestmove e2e4 ponder e7e5');
      expect(result).not.toBeNull();
      expect(result?.from).toBe('e2');
      expect(result?.to).toBe('e4');
      expect(result?.uci).toBe('e2e4');
    });

    it('parses a bestmove with promotion', () => {
      const result = parseBestMove('bestmove e7e8q');
      expect(result).not.toBeNull();
      expect(result?.from).toBe('e7');
      expect(result?.to).toBe('e8');
      expect(result?.promotion).toBe('q');
    });

    it('returns null for invalid input', () => {
      const result = parseBestMove('info score cp 15');
      expect(result).toBeNull();
    });

    it('returns null for bestmove (none)', () => {
      const result = parseBestMove('bestmove (none)');
      expect(result).toBeNull();
    });
  });

  describe('getRandomLegalMove', () => {
    it('returns a move from the list', () => {
      const moves = ['e2e4', 'd2d4', 'g1f3'];
      const move = getRandomLegalMove(moves);
      expect(moves).toContain(move);
    });

    it('returns null for an empty list', () => {
      expect(getRandomLegalMove([])).toBeNull();
    });
  });

    describe('createStockfishEngine', () => {
    it('creates an engine with idle status', () => {
      const engine = createStockfishEngine();
      expect(engine.getStatus()).toBe('idle');
    });

    it('initializes without error in test environment', async () => {
      const engine = createStockfishEngine();
      // In test environment (no Worker), initialize resolves immediately
      await expect(engine.initialize()).resolves.toBeUndefined();
      expect(engine.getStatus()).toBe('ready');
    });

    it('returns a move in test environment', async () => {
      const engine = createStockfishEngine();
      await engine.initialize();
      const move = await engine.getBestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(move).not.toBeNull();
      expect(move.from).toBeDefined();
      expect(move.to).toBeDefined();
      // Should complete well within 2000ms (test env uses mock)
    }, 2000);

    it('terminate resets status to idle', async () => {
      const engine = createStockfishEngine();
      await engine.initialize();
      engine.terminate();
      expect(engine.getStatus()).toBe('idle');
    });

    it('setSkillLevel does not throw in test environment', async () => {
      const engine = createStockfishEngine();
      await engine.initialize();
      expect(() => engine.setSkillLevel(10)).not.toThrow();
    });
  });
});
