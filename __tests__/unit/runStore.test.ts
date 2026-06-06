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
    // Новая башня: 5 этажей (sniper, flag, survival, quick_battle, boss)
    expect(s.nodes).toHaveLength(5);
    expect(s.floorTypes).toHaveLength(5);
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

  // ── структура башни ────────────────────────────────────────────────────────

  it('фиксированная последовательность: sniper, flag, survival, quick_battle, boss', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    const s = useRunStore.getState();
    expect(s.floorTypes[0]).toBe('sniper');
    expect(s.floorTypes[1]).toBe('flag');
    expect(s.floorTypes[2]).toBe('survival');
    expect(s.floorTypes[3]).toBe('quick_battle');
    expect(s.floorTypes[4]).toBe('boss');
  });

  it('последний узел (index 4) всегда boss', () => {
    for (let i = 0; i < 5; i++) {
      act(() => { useRunStore.getState().startRun('timmy_pawn'); });
      const s = useRunStore.getState();
      expect(s.nodes[4].type).toBe('boss');
      expect(s.floorTypes[4]).toBe('boss');
    }
  });

  it('первые 4 этажа — не boss', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    const s = useRunStore.getState();
    for (let f = 0; f < 4; f++) {
      expect(s.nodes[f].type).not.toBe('boss');
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

  it('startRun chapter 0: boss ELO is 750', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 0); });
    const s = useRunStore.getState();
    expect(s.chapterIndex).toBe(0);
    expect(s.nodes[4].chapterElo).toBe(750); // index 4 — boss
  });

  it('startRun chapter 1: boss ELO is 900', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 1); });
    const s = useRunStore.getState();
    expect(s.chapterIndex).toBe(1);
    expect(s.nodes[4].chapterElo).toBe(900);
  });

  it('startRun chapter 1: floor 0 ELO is 600', () => {
    act(() => { useRunStore.getState().startRun('finn_knight', 1); });
    const s = useRunStore.getState();
    expect(s.nodes[0].chapterElo).toBe(600);
  });

  it('startRun chapter 1: floor 3 (quick_battle, pre-boss) ELO is 760', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 1); });
    const s = useRunStore.getState();
    expect(s.nodes[3].chapterElo).toBe(760); // quick_battle перед боссом
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
