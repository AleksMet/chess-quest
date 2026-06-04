import { create } from 'zustand';
import type { Artifact, HeroId, MapNode, NodeType, RunState } from '../types';

const MAX_ARTIFACTS = 6;
const STARTING_GOLD = 100;

function generateNodes(): MapNode[] {
  const types: NodeType[] = ['quick_battle', 'puzzle', 'shop', 'ambush', 'boss'];
  const baseElo = 500;
  return types.map((type, i) => ({
    id: `node_${i}`,
    type,
    completed: false,
    accessible: i === 0,
    chapterElo: baseElo + i * 50,
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
    console.log('[STORE] earnGold:', amount);
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
}));
