import { create } from 'zustand';
import type { HeroId, MapNode, NodeType, RunState } from '../types';

// TODO: ХАОС режим — restore PASSIVE_POOL = ['shop', 'treasure'] when Chaos mode is added
const BATTLE_POOL: NodeType[] = ['ambush', 'quick_battle'];

// ELO progression per chapter: [floor1, floor3, floor5_preBoss, boss]
const CHAPTER_ELOS: [number, number, number, number][] = [
  [400, 500, 550, 750], // Chapter 0: Forest of Pawns
  [600, 700, 800, 900], // Chapter 1: Valley of Knights
];

function pickOne<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

// Tower of 6 floors: battle, treasure, battle, treasure, quick_battle, boss
function generateNodes(chapterIndex: number): MapNode[] {
  const [elo0, elo1, elo2, eloBoss] = CHAPTER_ELOS[chapterIndex] ?? CHAPTER_ELOS[0];
  const b0 = pickOne(BATTLE_POOL);
  const b1 = pickOne(BATTLE_POOL.filter(t => t !== b0));

  const sequence: [NodeType, number][] = [
    [b0, elo0], ['treasure', 0], [b1, elo1], ['treasure', 0], ['quick_battle', elo2], ['boss', eloBoss],
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
  startRun: (heroId: HeroId, chapterIndex?: number) => void;
  resetRun: () => void;
  addScore: (points: number) => void;
  completeNode: (nodeIndex: number) => void;
  advanceToNode: (nodeIndex: number) => void;
  setCurrentFen: (fen: string | null) => void;
  blessPiece: (piece: import('chess.js').PieceSymbol) => void;
  markKingChecked: () => void;
}

const INITIAL_STATE: RunState = {
  heroId: 'timmy_pawn',
  currentNodeIndex: 0,
  nodes: [],
  score: 0,
  masteryStars: 0,
  chapterIndex: 0,
  isActive: false,
  currentFen: null,
  blessedPiece: null,
  kingWasCheckedInRun: false,
};

export const useRunStore = create<RunStore>((set) => ({
  ...INITIAL_STATE,

  startRun: (heroId: HeroId, chapterIndex = 0) => {
    set({
      heroId,
      currentNodeIndex: 0,
      nodes: generateNodes(chapterIndex),
      score: 0,
      masteryStars: 0,
      chapterIndex,
      isActive: true,
      currentFen: null,
      blessedPiece: null,
      kingWasCheckedInRun: false,
    });
  },

  resetRun: () => set({ ...INITIAL_STATE }),

  addScore: (points: number) => {
    set(s => ({ score: s.score + points }));
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

  markKingChecked: () => {
    set({ kingWasCheckedInRun: true });
  },
}));
