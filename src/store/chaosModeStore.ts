import { create } from 'zustand';
import type { PieceSymbol } from 'chess.js';
import type { PieceUpgrade } from '../types/chaos';

// Фигура армии — храним только тип; конкретные клетки расставляет buildPlayerFen
export type ChessPiece = PieceSymbol;

// Идентификатор конкретного экземпляра фигуры в армии — `${pieceType}_${pieceIndex}`
export function pieceInstanceId(pieceType: ChessPiece, pieceIndex: number): string {
  return `${pieceType}_${pieceIndex}`;
}

// Артефакты сокровища — действуют до конца забега
export type ChaosArtifact = 'fork_master' | 'blitz_master';

interface ChaosState {
  // Армия игрока
  pieces: ChessPiece[];

  // Снимок армии перед боем — превращённые во время боя ферзи в него не попадают
  purchasedPieces: ChessPiece[];

  // Улучшения, купленные на конкретные фигуры армии
  pieceUpgrades: PieceUpgrade[];

  // Валюта
  gold: number;

  // Артефакты сокровища (активны до конца забега)
  artifacts: ChaosArtifact[];

  // Прогресс забега
  currentFloor: number;
  totalScore: number;
  floorScores: number[];

  // Сколько раз босс «Всадник» ещё может заспавнить коня (стартует с 5, обнуляется до конца боя)
  bossKnightSpawnsLeft: number;

  // Действия
  addPiece: (piece: ChessPiece) => void;
  removePiece: (piece: ChessPiece) => void;
  setPieces: (pieces: ChessPiece[]) => void;
  savePurchasedPieces: () => void;
  addUpgrade: (upgrade: PieceUpgrade) => void;
  removeUpgrade: (upgradeId: string) => void;
  canAddUpgrade: (pieceId: string) => boolean;
  getPieceUpgradeClass: (pieceId: string) => 'attack' | 'defense' | null;
  spendGold: (amount: number) => boolean;
  addGold: (amount: number) => void;
  addArtifact: (artifact: ChaosArtifact) => void;
  addScore: (score: number) => void;
  nextFloor: () => void;
  setBossKnightSpawnsLeft: (count: number) => void;
  resetRun: () => void;
}

// Стартовый набор: король e1 + 4 пешки (a2-d2)
const STARTING_PIECES: ChessPiece[] = ['k', 'p', 'p', 'p', 'p'];
const STARTING_GOLD = 150;
// Сколько раз босс «Всадник» может заспавнить коня за бой
const BOSS_KNIGHT_SPAWNS = 5;

function initialState() {
  return {
    pieces: [...STARTING_PIECES],
    purchasedPieces: [...STARTING_PIECES],
    pieceUpgrades: [] as PieceUpgrade[],
    gold: STARTING_GOLD,
    artifacts: [] as ChaosArtifact[],
    currentFloor: 0,
    totalScore: 0,
    floorScores: [] as number[],
    bossKnightSpawnsLeft: BOSS_KNIGHT_SPAWNS,
  };
}

export const useChaosModeStore = create<ChaosState>((set, get) => ({
  ...initialState(),

  addPiece: (piece) => set(s => ({ pieces: [...s.pieces, piece] })),

  removePiece: (piece) => set(s => {
    const idx = s.pieces.indexOf(piece);
    if (idx === -1) return s;
    const pieces = [...s.pieces];
    pieces.splice(idx, 1);
    return { pieces };
  }),

  setPieces: (pieces) => set({ pieces }),

  savePurchasedPieces: () => set(s => ({ purchasedPieces: [...s.pieces] })),

  addUpgrade: (upgrade) => set(s => ({ pieceUpgrades: [...s.pieceUpgrades, upgrade] })),

  removeUpgrade: (upgradeId) => set(s => ({
    pieceUpgrades: s.pieceUpgrades.filter(u => u.id !== upgradeId),
  })),

  canAddUpgrade: (pieceId) =>
    get().pieceUpgrades.filter(u => pieceInstanceId(u.pieceType, u.pieceIndex) === pieceId).length < 2,

  // На одну фигуру можно вешать улучшения только одного класса:
  // если уже есть атакующее — защитные недоступны, и наоборот. Нет улучшений — оба класса доступны.
  getPieceUpgradeClass: (pieceId) => {
    const upgrades = get().pieceUpgrades.filter(u => pieceInstanceId(u.pieceType, u.pieceIndex) === pieceId);
    if (upgrades.some(u => u.category === 'attack')) return 'attack';
    if (upgrades.some(u => u.category === 'defense')) return 'defense';
    return null;
  },

  spendGold: (amount) => {
    if (get().gold < amount) return false;
    set(s => ({ gold: s.gold - amount }));
    return true;
  },

  addGold: (amount) => set(s => ({ gold: s.gold + amount })),

  addArtifact: (artifact) => set(s =>
    s.artifacts.includes(artifact) ? s : { artifacts: [...s.artifacts, artifact] }
  ),

  addScore: (score) => set(s => ({
    totalScore: s.totalScore + score,
    floorScores: [...s.floorScores, score],
  })),

  nextFloor: () => set(s => ({ currentFloor: s.currentFloor + 1 })),

  setBossKnightSpawnsLeft: (count) => set({ bossKnightSpawnsLeft: count }),

  resetRun: () => set({ ...initialState() }),
}));
