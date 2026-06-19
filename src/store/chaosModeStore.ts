import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PieceSymbol } from 'chess.js';
import type { ChaosCharacter, PieceUpgrade, UpgradeCategory, UpgradeType, ChaosEventCategory } from '../types/chaos';
import type { PieceEffect } from '../types/pieceEffects';

// Фигура армии — храним только тип; конкретные клетки расставляет buildPlayerFen
export type ChessPiece = PieceSymbol;

// Идентификатор конкретного экземпляра фигуры в армии — `${pieceType}_${pieceIndex}`
export function pieceInstanceId(pieceType: ChessPiece, pieceIndex: number): string {
  return `${pieceType}_${pieceIndex}`;
}

// Артефакты сокровища — действуют до конца забега
export type ChaosArtifact = 'fork_master' | 'blitz_master';

interface ChaosState {
  // Выбранный персонаж забега — переживает resetRun (сбрасывается только при выборе нового)
  selectedCharacter: ChaosCharacter | null;

  // Разблокирован ли персонаж «Страж» — сохраняется в AsyncStorage между сессиями
  guardianUnlocked: boolean;

  // Армия игрока
  pieces: ChessPiece[];

  // Снимок армии перед боем — превращённые во время боя ферзи в него не попадают
  purchasedPieces: ChessPiece[];

  // Улучшения, купленные на конкретные фигуры армии
  pieceUpgrades: PieceUpgrade[];

  // Универсальные эффекты фигур текущего боя (улучшения + дебаффы) — мигрируются
  // из pieceUpgrades/cursedPieceId при инициализации боя, работает параллельно с pieceUpgrades
  pieceEffects: PieceEffect[];

  // Валюта
  gold: number;

  // Артефакты сокровища (активны до конца забега)
  artifacts: ChaosArtifact[];

  // Прогресс забега
  currentFloor: number;
  currentLevel: number; // 1, 2, 3
  totalScore: number;
  floorScores: number[];

  // Выбор маршрута на узле choice (Долина Коней) — battleIndex выбранного боя ('elite' или индекс)
  chosenPath: number | 'elite' | null;

  // Сколько раз босс «Всадник» ещё может заспавнить коня (стартует с 5, обнуляется до конца боя)
  bossKnightSpawnsLeft: number;

  // Случайные события: категория последнего события (null = ещё не было)
  lastEventCategory: ChaosEventCategory | null;
  // Ожидающее событие — устанавливается в handleForward башни, читается экраном chaos-event
  pendingEventId: string | null;
  // Маршрут после события — куда перейти из chaos-event напрямую, минуя башню
  nextRoute: string | null;
  // Проклятие: pieceId вида 'r_0' — самая ценная фигура лишается возможности брать сильные фигуры в следующем бою
  cursedPieceId: string | null;

  // Действия
  setCharacter: (character: ChaosCharacter) => void;
  loadGuardianUnlocked: () => Promise<void>;
  unlockGuardian: () => Promise<void>;
  getUpgradePrice: (basePrice: number, category: UpgradeCategory) => number;
  isUpgradeAvailable: (category: UpgradeCategory) => boolean;
  addPiece: (piece: ChessPiece) => void;
  removePiece: (piece: ChessPiece) => void;
  setPieces: (pieces: ChessPiece[]) => void;
  savePurchasedPieces: () => void;
  setPieceEffects: (effects: PieceEffect[]) => void;
  addUpgrade: (upgrade: PieceUpgrade) => void;
  removeUpgrade: (upgradeId: string) => void;
  canAddUpgrade: (pieceId: string) => boolean;
  hasUpgradeType: (pieceId: string, upgradeType: UpgradeType) => boolean;
  getPieceUpgradeClass: (pieceId: string) => 'attack' | 'defense' | null;
  spendGold: (amount: number) => boolean;
  addGold: (amount: number) => void;
  setGold: (amount: number) => void;
  addArtifact: (artifact: ChaosArtifact) => void;
  addScore: (score: number) => void;
  nextFloor: () => void;
  setLevel: (level: number) => void;
  resetFloor: () => void;
  setChosenPath: (path: number | 'elite' | null) => void;
  setBossKnightSpawnsLeft: (count: number) => void;
  setLastEventCategory: (cat: ChaosEventCategory) => void;
  setPendingEventId: (id: string) => void;
  clearPendingEvent: () => void;
  setNextRoute: (route: string | null) => void;
  setCursedPiece: (id: string) => void;
  clearCursedPiece: () => void;
  battlesCompleted: number;
  incrementBattlesCompleted: () => void;
  resetRun: () => void;
}

// Стартовый набор по умолчанию (если персонаж ещё не выбран): король e1 + 4 пешки (a2-d2)
const STARTING_PIECES: ChessPiece[] = ['k', 'p', 'p', 'p', 'p'];
const STARTING_GOLD = 150;
// Сколько раз босс «Всадник» может заспавнить коня за бой
const BOSS_KNIGHT_SPAWNS = 5;

const GUARDIAN_UNLOCKED_KEY = '@chess_quest_chaos_guardian_unlocked';

// Состояние забега — пересоздаётся в resetRun(); набор и золото берутся из персонажа, если он выбран
function runState(character: ChaosCharacter | null) {
  const startingPieces = character ? character.startingPieces : STARTING_PIECES;
  return {
    pieces: [...startingPieces],
    purchasedPieces: [...startingPieces],
    pieceUpgrades: [] as PieceUpgrade[],
    pieceEffects: [] as PieceEffect[],
    gold: character ? character.startingGold : STARTING_GOLD,
    artifacts: [] as ChaosArtifact[],
    currentFloor: 0,
    currentLevel: 1,
    totalScore: 0,
    floorScores: [] as number[],
    chosenPath: null as number | 'elite' | null,
    bossKnightSpawnsLeft: BOSS_KNIGHT_SPAWNS,
    lastEventCategory: null as ChaosEventCategory | null,
    pendingEventId: null as string | null,
    nextRoute: null as string | null,
    cursedPieceId: null as string | null,
    battlesCompleted: 0,
  };
}

export const useChaosModeStore = create<ChaosState>((set, get) => ({
  selectedCharacter: null,
  guardianUnlocked: false,
  ...runState(null),

  setCharacter: (character) => set({ selectedCharacter: character }),

  loadGuardianUnlocked: async () => {
    try {
      const raw = await AsyncStorage.getItem(GUARDIAN_UNLOCKED_KEY);
      if (raw === 'true') set({ guardianUnlocked: true });
    } catch {
      // Persistence failure is non-fatal — Страж останется заблокирован до следующей загрузки
    }
  },

  unlockGuardian: async () => {
    set({ guardianUnlocked: true });
    try {
      await AsyncStorage.setItem(GUARDIAN_UNLOCKED_KEY, 'true');
    } catch {
      // Persistence failure is non-fatal — разблокировка останется в текущей сессии
    }
  },

  // Скидка персонажа уменьшает цену, наценка — увеличивает (взаимоисключающе по спецификации персонажей)
  getUpgradePrice: (basePrice, category) => {
    const character = get().selectedCharacter;
    if (!character) return basePrice;
    const discount = category === 'attack' ? character.attackUpgradeDiscount : character.defenseUpgradeDiscount;
    if (discount > 0) return Math.round(basePrice * (1 - discount));
    if (character.upgradeMarkup > 0) return Math.round(basePrice * (1 + character.upgradeMarkup));
    return basePrice;
  },

  isUpgradeAvailable: (category) => {
    const character = get().selectedCharacter;
    if (!character) return true;
    return character.allowedUpgradeCategories === 'all' || character.allowedUpgradeCategories.includes(category);
  },

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

  setPieceEffects: (effects) => set({ pieceEffects: effects }),

  addUpgrade: (upgrade) => set(s => ({ pieceUpgrades: [...s.pieceUpgrades, upgrade] })),

  removeUpgrade: (upgradeId) => set(s => ({
    pieceUpgrades: s.pieceUpgrades.filter(u => u.id !== upgradeId),
  })),

  canAddUpgrade: (pieceId) =>
    get().pieceUpgrades.filter(u => pieceInstanceId(u.pieceType, u.pieceIndex) === pieceId).length < 2,

  // Защита от дублирующихся улучшений одного типа на одной фигуре
  hasUpgradeType: (pieceId, upgradeType) =>
    get().pieceUpgrades.some(u => pieceInstanceId(u.pieceType, u.pieceIndex) === pieceId && u.upgradeType === upgradeType),

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

  setGold: (amount) => set({ gold: amount }),

  addArtifact: (artifact) => set(s =>
    s.artifacts.includes(artifact) ? s : { artifacts: [...s.artifacts, artifact] }
  ),

  addScore: (score) => set(s => ({
    totalScore: s.totalScore + score,
    floorScores: [...s.floorScores, score],
  })),

  nextFloor: () => set(s => ({ currentFloor: s.currentFloor + 1 })),

  setLevel: (level) => set({ currentLevel: level }),
  resetFloor: () => set({ currentFloor: 0 }),
  setChosenPath: (path) => set({ chosenPath: path }),

  setBossKnightSpawnsLeft: (count) => set({ bossKnightSpawnsLeft: count }),

  setLastEventCategory: (cat) => set({ lastEventCategory: cat }),
  setPendingEventId: (id) => set({ pendingEventId: id }),
  clearPendingEvent: () => set({ pendingEventId: null }),
  setNextRoute: (route) => set({ nextRoute: route }),
  setCursedPiece: (id) => set({ cursedPieceId: id }),
  clearCursedPiece: () => set({ cursedPieceId: null }),

  incrementBattlesCompleted: () => set(s => ({ battlesCompleted: s.battlesCompleted + 1 })),

  resetRun: () => set(s => ({ ...runState(s.selectedCharacter) })),
}));
