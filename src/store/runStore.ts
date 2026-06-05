import { create } from 'zustand';
import type { Artifact, HeroId, MapNode, NodeType, RunState } from '../types';

const MAX_ARTIFACTS = 6;
const STARTING_GOLD = 100;

const BATTLE_POOL: NodeType[] = ['ambush', 'quick_battle'];
const PASSIVE_POOL: NodeType[] = ['shop', 'treasure'];

function pickOne<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Tower of 6 floors (index 0 = floor 1, index 5 = floor 6/boss):
 *   Floor 1 (idx 0): ambush or quick_battle   ELO 400
 *   Floor 2 (idx 1): shop or treasure
 *   Floor 3 (idx 2): ambush or quick_battle   ELO 500 (different from floor 1)
 *   Floor 4 (idx 3): shop or treasure         (different from floor 2)
 *   Floor 5 (idx 4): quick_battle             ELO 550  ← last before boss
 *   Floor 6 (idx 5): boss                     ELO 750
 */
function generateNodes(): MapNode[] {
  const b0 = pickOne(BATTLE_POOL);
  const p0 = pickOne(PASSIVE_POOL);
  const b1 = pickOne(BATTLE_POOL.filter(t => t !== b0));
  const p1 = pickOne(PASSIVE_POOL.filter(t => t !== p0));

  const sequence: [NodeType, number][] = [
    [b0, 400], [p0, 0], [b1, 500], [p1, 0], ['quick_battle', 550], ['boss', 750],
  ];

  return sequence.map(([type, elo], i) => ({
    id: `node_${i}`,
    type,
    completed: false,
    accessible: i === 0,
    chapterElo: elo,
  }));
}

interface RunStore extends RunState {
  startRun: (heroId: HeroId) => void;
  resetRun: () => void;
  addArtifact: (artifact: Artifact) => boolean;
  removeArtifact: (artifactId: string) => void;
  spendGold: (amount: number) => boolean;
  earnGold: (amount: number) => void;
  completeNode: (nodeIndex: number) => void;
  advanceToNode: (nodeIndex: number) => void;
  setCurrentFen: (fen: string | null) => void;
  blessPiece: (piece: import('chess.js').PieceSymbol) => void;
}

const INITIAL_STATE: RunState = {
  heroId: 'timmy_pawn',
  currentNodeIndex: 0,
  nodes: [],
  artifacts: [],
  gold: 0,
  masteryStars: 0,
  chapterIndex: 0,
  isActive: false,
  currentFen: null,
  blessedPiece: null,
};

export const useRunStore = create<RunStore>((set, get) => ({
  ...INITIAL_STATE,

  startRun: (heroId: HeroId) => {
    set({
      heroId,
      currentNodeIndex: 0,
      nodes: generateNodes(),
      artifacts: [],
      gold: STARTING_GOLD,
      masteryStars: 0,
      chapterIndex: 0,
      isActive: true,
    });
  },

  resetRun: () => set({ ...INITIAL_STATE }),

  addArtifact: (artifact: Artifact): boolean => {
    const { artifacts } = get();
    if (artifacts.length >= MAX_ARTIFACTS) return false;
    set({ artifacts: [...artifacts, artifact] });
    return true;
  },

  removeArtifact: (artifactId: string) => {
    set(s => ({ artifacts: s.artifacts.filter(a => a.id !== artifactId) }));
  },

  spendGold: (amount: number): boolean => {
    const { gold } = get();
    if (gold < amount) return false;
    set({ gold: gold - amount });
    return true;
  },

  earnGold: (amount: number) => {
    set(s => ({ gold: s.gold + amount }));
  },

  completeNode: (nodeIndex: number) => {
    set(s => {
      const nodes = s.nodes.map((n, i) => {
        if (i === nodeIndex) return { ...n, completed: true };
        if (i === nodeIndex + 1) return { ...n, accessible: true };
        return n;
      });
      return { nodes };
    });
  },

  advanceToNode: (nodeIndex: number) => {
    set({ currentNodeIndex: nodeIndex });
  },

  setCurrentFen: (fen: string | null) => {
    set({ currentFen: fen });
  },

  blessPiece: (piece) => {
    set({ blessedPiece: piece });
  },
}));
