import type { PieceSymbol } from 'chess.js';
import type { ChessPiece } from '../store/chaosModeStore';
import type { ChaosEventCategory, ChaosEventId } from '../types/chaos';
import { CHAOS_EVENTS } from '../data/chaosEvents';
import type { PieceUpgrade } from '../types/chaos';

// 60% шанс события после каждого боя (по GDD §22)
const EVENT_TRIGGER_CHANCE = 0.6;

export function shouldTriggerEvent(): boolean {
  return Math.random() < EVENT_TRIGGER_CHANCE;
}

// Объединяет проверку вероятности и выбор события — возвращает eventId или null
export function selectRandomEvent(ctx: RollCtx): ChaosEventId | null {
  if (!shouldTriggerEvent()) return null;
  return rollChaosEvent(ctx);
}

interface RollCtx {
  lastEventCategory: ChaosEventCategory | null;
  pieces: ChessPiece[];
  gold: number;
  pieceUpgrades: PieceUpgrade[];
}

// Вероятности категорий по GDD: положительное 40%, нейтральное 35%, отрицательное 25%.
// Если отрицательное заблокировано — перераспределяем оставшиеся 25% поровну.
function rollCategory(ctx: RollCtx): ChaosEventCategory {
  const nonKingPieces = ctx.pieces.filter(p => p !== 'k');
  const canNegative = ctx.lastEventCategory !== 'negative' && nonKingPieces.length > 2;

  const roll = Math.random();
  if (!canNegative) {
    return roll < 0.533 ? 'positive' : 'neutral';
  }
  if (roll < 0.40) return 'positive';
  if (roll < 0.75) return 'neutral';
  return 'negative';
}

// Ценность фигуры для выбора «жертвы» и для проклятия
const PIECE_VALUE_FOR_EVENT: Partial<Record<PieceSymbol, number>> = { q: 9, r: 5, b: 3, n: 3, p: 1 };

function hasPieceWithoutUpgrade(pieces: ChessPiece[], upgrades: PieceUpgrade[]): boolean {
  const typeCounts: Partial<Record<ChessPiece, number>> = {};
  for (const p of pieces) {
    if (p === 'k') continue;
    const idx = typeCounts[p] ?? 0;
    typeCounts[p] = idx + 1;
    const id = `${p}_${idx}`;
    if (!upgrades.some(u => `${u.pieceType}_${u.pieceIndex}` === id)) return true;
  }
  return false;
}

function hasPieceWithUpgrade(pieces: ChessPiece[], upgrades: PieceUpgrade[]): boolean {
  return pieces.some((p, _) => {
    if (p === 'k') return false;
    return upgrades.some(u => u.pieceType === p);
  });
}

function isEligible(id: ChaosEventId, ctx: RollCtx): boolean {
  switch (id) {
    case 'treasury_fire':    return ctx.gold >= 50;
    case 'traitor':          return hasPieceWithoutUpgrade(ctx.pieces, ctx.pieceUpgrades);
    case 'relic_trader':     return ctx.pieces.includes('r');
    case 'fortune_teller':   return ctx.gold >= 60;
    case 'recruiter':        return ctx.pieces.filter(p => p === 'p').length >= 3;
    case 'alchemist':        return hasPieceWithUpgrade(ctx.pieces, ctx.pieceUpgrades);
    case 'deserter': {
      const n = ctx.pieces.filter(p => p === 'n').length;
      const b = ctx.pieces.filter(p => p === 'b').length;
      return n < 2 || b < 2;
    }
    default: return true;
  }
}

function rollEventId(category: ChaosEventCategory, ctx: RollCtx): ChaosEventId {
  const pool = CHAOS_EVENTS.filter(e => e.category === category && isEligible(e.id, ctx));
  // Если пул пустой (все события категории недоступны) — fallback на war_loot
  const selected = pool.length > 0 ? pool : CHAOS_EVENTS.filter(e => e.id === 'war_loot');
  return selected[Math.floor(Math.random() * selected.length)].id;
}

export function rollChaosEvent(ctx: RollCtx): ChaosEventId {
  const category = rollCategory(ctx);
  return rollEventId(category, ctx);
}

// Идентификатор самой ценной фигуры в армии (кроме короля) — для события «Проклятие»
export function findStrongestPieceId(pieces: ChessPiece[]): string | null {
  const typeCounts: Partial<Record<ChessPiece, number>> = {};
  let best: { id: string; value: number } | null = null;

  for (const piece of pieces) {
    if (piece === 'k') continue;
    const idx = typeCounts[piece] ?? 0;
    typeCounts[piece] = idx + 1;
    const value = PIECE_VALUE_FOR_EVENT[piece] ?? 0;
    if (!best || value > best.value) {
      best = { id: `${piece}_${idx}`, value };
    }
  }
  return best?.id ?? null;
}

// Выбирает жертву для «Засады врагов» — не короля, улучшенные теряются последними
export function pickAmbushVictim(pieces: ChessPiece[], upgrades: PieceUpgrade[]): string | null {
  const PIECE_VALUE_ORDER: ChessPiece[] = ['p', 'n', 'b', 'r', 'q'];
  const typeCounts: Partial<Record<ChessPiece, number>> = {};
  const candidates: { id: string; hasUpgrade: boolean; value: number }[] = [];

  for (const piece of pieces) {
    if (piece === 'k') continue;
    const idx = typeCounts[piece] ?? 0;
    typeCounts[piece] = idx + 1;
    const id = `${piece}_${idx}`;
    const hasUpgrade = upgrades.some(u => `${u.pieceType}_${u.pieceIndex}` === id);
    candidates.push({ id, hasUpgrade, value: PIECE_VALUE_ORDER.indexOf(piece) });
  }

  if (candidates.length === 0) return null;

  // Предпочитаем фигуры без улучшений и с наименьшей ценностью
  const noUpgrade = candidates.filter(c => !c.hasUpgrade);
  const pool = noUpgrade.length > 0 ? noUpgrade : candidates;
  pool.sort((a, b) => a.value - b.value);
  return pool[0].id;
}

// Случайная пешка без улучшения — для вербовщика
export function pickPawnId(pieces: ChessPiece[]): string | null {
  const typeCounts: Partial<Record<ChessPiece, number>> = {};
  const pawnIds: string[] = [];
  for (const piece of pieces) {
    const idx = typeCounts[piece] ?? 0;
    typeCounts[piece] = idx + 1;
    if (piece === 'p') pawnIds.push(`p_${idx}`);
  }
  return pawnIds.length > 0 ? pawnIds[0] : null;
}

// Случайная фигура без улучшений (не король) — для «Предателя»
export function pickTraitorVictimId(pieces: ChessPiece[], upgrades: PieceUpgrade[]): string | null {
  const typeCounts: Partial<Record<ChessPiece, number>> = {};
  const pool: string[] = [];
  for (const piece of pieces) {
    if (piece === 'k') { typeCounts[piece] = (typeCounts[piece] ?? 0) + 1; continue; }
    const idx = typeCounts[piece] ?? 0;
    typeCounts[piece] = idx + 1;
    const id = `${piece}_${idx}`;
    if (!upgrades.some(u => `${u.pieceType}_${u.pieceIndex}` === id)) pool.push(id);
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Парсит pieceId вида 'r_1' → { pieceType: 'r', pieceIndex: 1 }
export function parsePieceId(id: string): { pieceType: PieceSymbol; pieceIndex: number } {
  const [type, idx] = id.split('_');
  return { pieceType: type as PieceSymbol, pieceIndex: parseInt(idx, 10) };
}

// Описание армии ИИ — для события «Гадалка»
import type { ChaosBattleNumber } from './chaosBattle';

export function describeAiBattle(battleNumber: ChaosBattleNumber): string {
  switch (battleNumber) {
    case 1:    return 'Король, 6 Пешек, Конь, Слон, Ладья';
    case 2:    return 'Король, 6 Пешек, 2 Коня, Слон, Ладья';
    case 'boss': return 'Король, 8 Пешек, 2 Ферзя, 2 Ладьи, Конь';
  }
}
