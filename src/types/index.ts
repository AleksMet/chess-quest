import type { Chess, Move, Square, PieceSymbol, Color } from 'chess.js';

// ─── Rarity ──────────────────────────────────────────────────────────────────

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type ArtifactCategory =
  | 'pawn'
  | 'knight'
  | 'bishop'
  | 'rook'
  | 'queen'
  | 'king'
  | 'universal';

// ─── Battle context ───────────────────────────────────────────────────────────

export interface BattleContext {
  chess: Chess;
  move: Move;
  positionFenBefore: string;
  goldBalance: number;
  artifacts: Artifact[];
  hero: Hero;
  moveNumber: number;
  playerColor: Color;
  kingCheckedThisGame?: boolean;
}

export interface RewardResult {
  gold: number;
  masteryStars: number;
  triggeredArtifactIds: string[];
  log: string[];
}

// ─── Artifact ─────────────────────────────────────────────────────────────────

export interface Artifact {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: ArtifactCategory;
  shopPrice: number;
  sellPrice: number;
  effect: (context: BattleContext) => RewardResult;
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export type HeroId =
  | 'timmy_pawn'
  | 'finn_knight'
  | 'archimag_bishop'
  | 'tower_golem'
  | 'queen_aurora'
  | 'iron_king';

export interface Hero {
  id: HeroId;
  name: string;
  description: string;
  figure: PieceSymbol;
  unlocked: boolean;
  auraDescription: string;
  applyAura: (reward: RewardResult, context: BattleContext) => RewardResult;
}

// ─── Map / Run ────────────────────────────────────────────────────────────────

export type NodeType =
  | 'battle'
  | 'elite'
  | 'treasure'
  | 'shop'
  | 'event'
  | 'challenge'
  | 'boss'
  | 'academy'
  | 'blitz'
  | 'oracle';

export interface MapNode {
  id: string;
  type: NodeType;
  completed: boolean;
  accessible: boolean;
  chapterElo: number;
}

export interface RunState {
  heroId: HeroId;
  currentNodeIndex: number;
  nodes: MapNode[];
  artifacts: Artifact[];
  gold: number;
  masteryStars: number;
  chapterIndex: number;
  isActive: boolean;
}

// ─── Battle ───────────────────────────────────────────────────────────────────

export type BattleResult = 'player_win' | 'player_lose' | 'draw' | 'ongoing';

export interface BattleState {
  fen: string;
  playerColor: Color;
  opponentElo: number;
  result: BattleResult;
  goldEarned: number;
  masteryStarsEarned: number;
  moveCount: number;
  kingCheckedThisGame: boolean;
  queenAlive: boolean;
}

// ─── Chess helpers ────────────────────────────────────────────────────────────

export interface ForkResult {
  isFork: boolean;
  attackedPieces: AttackedPiece[];
}

export interface AttackedPiece {
  square: Square;
  piece: PieceSymbol;
  color: Color;
}

export interface PinResult {
  isPin: boolean;
  pinnedSquare: Square | null;
  pinnerSquare: Square | null;
  valuablePieceSquare: Square | null;
}

export interface OpenFileResult {
  isOpen: boolean;
  isSemiOpen: boolean;
  file: string;
}

// ─── Difficulty ───────────────────────────────────────────────────────────────

export interface DifficultyState {
  currentElo: number;
  recentResults: boolean[];
  chapterBaseElo: number;
}

// ─── Meta progress ────────────────────────────────────────────────────────────

export interface ChapterProgress {
  chapterIndex: number;
  unlocked: boolean;
  wins: number;
  losses: number;
  bestGold: number;
}

export interface MetaProgress {
  unlockedHeroes: HeroId[];
  unlockedArtifactIds: string[];
  chapters: ChapterProgress[];
  crystals: number;
  masteryStars: number;
  totalRuns: number;
  achievements: string[];
  onboardingCompleted: boolean;
}

// ─── Bosses ───────────────────────────────────────────────────────────────────

export interface Boss {
  id: string;
  name: string;
  chapterIndex: number;
  elo: number;
  dialogBefore: string;
  dialogAfter: string;
  weakness: string;
  rewardGold: number;
  rewardArtifactId: string;
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

export interface Chapter {
  index: number;
  name: string;
  description: string;
  eloRange: [number, number];
  nodeCount: number;
  bossId: string;
  atmosphere: string;
}

// ─── Stockfish ────────────────────────────────────────────────────────────────

export interface StockfishMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  uci: string;
}

export interface StockfishConfig {
  skillLevel: number;
  moveTimeMs: number;
  timeoutMs: number;
}
