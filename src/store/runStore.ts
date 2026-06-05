import { create } from 'zustand';
import type { HeroId, MapNode, NodeType, RunState } from '../types';
import { generateFloorTypes } from '../data/towerConfig';
import type { FloorType } from '../data/towerConfig';

// ELO progression per chapter: 7 floors [f0..f5, boss]
const CHAPTER_ELOS: number[][] = [
  [400, 450, 500, 520, 540, 550, 750], // Chapter 0: Forest of Pawns
  [600, 650, 700, 720, 760, 800, 900], // Chapter 1: Valley of Knights
];

// Tower of 7 floors: 6 battle floors (types from floorTypes) + 1 boss
function generateNodes(chapterIndex: number, floorTypes: FloorType[]): MapNode[] {
  const elos = CHAPTER_ELOS[chapterIndex] ?? CHAPTER_ELOS[0];

  return floorTypes.map((ft, i) => ({
    id: `node_${i}`,
    type: ft as NodeType,
    completed: false,
    accessible: i === 0,
    chapterElo: elos[i] ?? elos[elos.length - 1],
  }));
}

interface RunStore extends RunState {
  floorTypes: FloorType[];
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
  floorTypes: [],

  startRun: (heroId: HeroId, chapterIndex = 0) => {
    const floorTypes = generateFloorTypes();
    set({
      heroId,
      currentNodeIndex: 0,
      nodes: generateNodes(chapterIndex, floorTypes),
      floorTypes,
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
