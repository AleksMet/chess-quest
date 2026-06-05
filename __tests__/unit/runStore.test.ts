import { act } from '@testing-library/react-native';
import { useRunStore } from '../../src/store/runStore';
import { ARTIFACTS } from '../../src/data/artifacts';

beforeEach(() => {
  useRunStore.getState().resetRun();
});

describe('runStore', () => {
  // ── initial state ───────────────────────────────────────────────────────────

  it('startRun sets correct initial state', () => {
    act(() => {
      useRunStore.getState().startRun('timmy_pawn');
    });
    const s = useRunStore.getState();
    expect(s.isActive).toBe(true);
    expect(s.heroId).toBe('timmy_pawn');
    expect(s.gold).toBe(100);
    expect(s.artifacts).toHaveLength(0);
    expect(s.currentNodeIndex).toBe(0);
    expect(s.nodes).toHaveLength(6);
  });

  it('initial state before startRun is inactive', () => {
    const s = useRunStore.getState();
    expect(s.isActive).toBe(false);
    expect(s.artifacts).toHaveLength(0);
  });

  // ── artifacts ───────────────────────────────────────────────────────────────

  it('addArtifact adds artifact to slot', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    const artifact = ARTIFACTS[0];
    act(() => { useRunStore.getState().addArtifact(artifact); });
    expect(useRunStore.getState().artifacts).toHaveLength(1);
    expect(useRunStore.getState().artifacts[0].id).toBe(artifact.id);
  });

  it('addArtifact cannot exceed limit of 6', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    for (let i = 0; i < 6; i++) {
      act(() => { useRunStore.getState().addArtifact({ ...ARTIFACTS[0], id: `art_${i}` }); });
    }
    // Try to add 7th
    const result = useRunStore.getState().addArtifact({ ...ARTIFACTS[0], id: 'art_overflow' });
    expect(result).toBe(false);
    expect(useRunStore.getState().artifacts).toHaveLength(6);
  });

  it('removeArtifact removes correct artifact', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().addArtifact({ ...ARTIFACTS[0], id: 'to_remove' }); });
    act(() => { useRunStore.getState().addArtifact({ ...ARTIFACTS[1], id: 'to_keep' }); });
    act(() => { useRunStore.getState().removeArtifact('to_remove'); });
    const ids = useRunStore.getState().artifacts.map(a => a.id);
    expect(ids).not.toContain('to_remove');
    expect(ids).toContain('to_keep');
  });

  // ── gold ────────────────────────────────────────────────────────────────────

  it('spendGold reduces gold balance', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().spendGold(40); });
    expect(useRunStore.getState().gold).toBe(60);
  });

  it('spendGold rejects when insufficient gold', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    const result = useRunStore.getState().spendGold(999);
    expect(result).toBe(false);
    expect(useRunStore.getState().gold).toBe(100);
  });

  it('earnGold increases gold balance', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().earnGold(50); });
    expect(useRunStore.getState().gold).toBe(150);
  });

  // ── run structure ───────────────────────────────────────────────────────────

  it('slot 4 is always quick_battle and slot 5 is always boss', () => {
    for (let i = 0; i < 5; i++) {
      act(() => { useRunStore.getState().startRun('timmy_pawn'); });
      const s = useRunStore.getState();
      expect(s.nodes[4].type).toBe('quick_battle');
      expect(s.nodes[5].type).toBe('boss');
    }
  });

  it('battle slots 0 and 2 are always different types', () => {
    for (let i = 0; i < 10; i++) {
      act(() => { useRunStore.getState().startRun('timmy_pawn'); });
      const s = useRunStore.getState();
      expect(s.nodes[0].type).not.toBe(s.nodes[2].type);
    }
  });

  it('passive slots 1 and 3 are always different types', () => {
    for (let i = 0; i < 10; i++) {
      act(() => { useRunStore.getState().startRun('timmy_pawn'); });
      const s = useRunStore.getState();
      expect(s.nodes[1].type).not.toBe(s.nodes[3].type);
    }
  });

  // ── map navigation ──────────────────────────────────────────────────────────

  it('completeNode marks node completed and unlocks next', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn'); });
    act(() => { useRunStore.getState().completeNode(0); });
    const s = useRunStore.getState();
    expect(s.nodes[0].completed).toBe(true);
    expect(s.nodes[1].accessible).toBe(true);
  });

  // ── chapter support ─────────────────────────────────────────────────────────

  it('startRun chapter 0: boss ELO is 750', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 0); });
    const s = useRunStore.getState();
    expect(s.chapterIndex).toBe(0);
    expect(s.nodes[5].chapterElo).toBe(750);
  });

  it('startRun chapter 1: boss ELO is 900', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 1); });
    const s = useRunStore.getState();
    expect(s.chapterIndex).toBe(1);
    expect(s.nodes[5].chapterElo).toBe(900);
  });

  it('startRun chapter 1: floor 1 ELO is 600', () => {
    act(() => { useRunStore.getState().startRun('finn_knight', 1); });
    const s = useRunStore.getState();
    expect(s.nodes[0].chapterElo).toBe(600);
  });

  it('startRun chapter 1: pre-boss quick_battle ELO is 800', () => {
    act(() => { useRunStore.getState().startRun('timmy_pawn', 1); });
    const s = useRunStore.getState();
    expect(s.nodes[4].type).toBe('quick_battle');
    expect(s.nodes[4].chapterElo).toBe(800);
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
