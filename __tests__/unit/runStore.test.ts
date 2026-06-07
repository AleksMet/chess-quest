import { act } from '@testing-library/react-native';
import { useRunStore } from '../../src/store/runStore';

beforeEach(() => {
  useRunStore.getState().resetRun();
});

describe('runStore', () => {
  // ── начальное состояние ────────────────────────────────────────────────────

  it('startRun sets correct initial state', () => {
    act(() => {
      useRunStore.getState().startRun('timmy_pawn');
    });
    const s = useRunStore.getState();
    expect(s.isActive).toBe(true);
    expect(s.heroId).toBe('timmy_pawn');
    expect(s.score).toBe(0);
    expect(s.currentNodeIndex).toBe(0);
    // Новая башня: 4 этажа (handicap, clock, advantage, free)
    expect(s.nodes).toHaveLength(4);
    expect(s.floorTypes).toHaveLength(4);
    expect(s.floorScores).toEqual([0, 0, 0, 0]);
  });

  it('initial state before startRun is inactive', () => {
    const s = useRunStore.getState();
    expect(s.isActive).toBe(false);
    expect(s.score).toBe(0);
  });

  // ── очки ──────────────────────────────────────────────────────────────────

  it('addScore increases score', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().addScore(150); });
    expect(useRunStore.getState().score).toBe(150);
  });

  it('addScore accumulates across multiple calls', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().addScore(100); });
    act(() => { useRunStore.getState().addScore(50); });
    expect(useRunStore.getState().score).toBe(150);
  });

  it('recordFloorScore stores per-floor score AND adds it to the total (no double counting)', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().recordFloorScore(0, 200); });
    act(() => { useRunStore.getState().recordFloorScore(1, 80); });
    const s = useRunStore.getState();
    expect(s.floorScores[0]).toBe(200);
    expect(s.floorScores[1]).toBe(80);
    expect(s.score).toBe(280);
  });

  // ── структура башни ────────────────────────────────────────────────────────

  it('фиксированная последовательность: handicap, clock, advantage, free', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    const s = useRunStore.getState();
    expect(s.floorTypes[0]).toBe('handicap');
    expect(s.floorTypes[1]).toBe('clock');
    expect(s.floorTypes[2]).toBe('advantage');
    expect(s.floorTypes[3]).toBe('free');
  });

  it('последний узел (index 3) всегда free', () => {
    for (let i = 0; i < 5; i++) {
      act(() => { useRunStore.getState().startRun('timmy_pawn'); });
      const s = useRunStore.getState();
      expect(s.nodes[3].type).toBe('free');
      expect(s.floorTypes[3]).toBe('free');
    }
  });

  // ── навигация по карте ────────────────────────────────────────────────────

  it('completeNode marks node completed and unlocks next', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().completeNode(0); });
    const s = useRunStore.getState();
    expect(s.nodes[0].completed).toBe(true);
    expect(s.nodes[1].accessible).toBe(true);
  });

  // ── поддержка глав ────────────────────────────────────────────────────────

  // Новые режимы — фиксированный ELO, одинаковый для всех глав (см. TASK 6):
  // handicap=900, clock=800, advantage=1000, free=900
  it('startRun chapter 0: ELO по этажам — 900/800/1000/900', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 0); });
    const s = useRunStore.getState();
    expect(s.chapterIndex).toBe(0);
    expect(s.nodes[0].chapterElo).toBe(900);
    expect(s.nodes[1].chapterElo).toBe(800);
    expect(s.nodes[2].chapterElo).toBe(1000);
    expect(s.nodes[3].chapterElo).toBe(900);
  });

  it('startRun chapter 1: ELO по этажам — 900/800/1000/900', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 1); });
    const s = useRunStore.getState();
    expect(s.chapterIndex).toBe(1);
    expect(s.nodes[0].chapterElo).toBe(900);
    expect(s.nodes[1].chapterElo).toBe(800);
    expect(s.nodes[2].chapterElo).toBe(1000);
    expect(s.nodes[3].chapterElo).toBe(900);
  });

  it('startRun resets FEN and blessedPiece on new chapter run', () => {
    act(() => {
      useRunStore.getState().startRun('timmy_pawn', 0);
      useRunStore.getState().setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });
    act(() => { useRunStore.getState().startRun('timmy_pawn', 1); });
    const s = useRunStore.getState();
    expect(s.currentFen).toBeNull();
    expect(s.blessedPiece).toBeNull();
    expect(s.kingWasCheckedInRun).toBe(false);
  });
});
