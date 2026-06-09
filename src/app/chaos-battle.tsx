import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Move } from 'chess.js';
import { ChessBoard } from '../components/chess/ChessBoard';
import { StockfishBridgeView } from '../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../components/engine/StockfishBridgeView';
import { ChaosGoldToastStack } from '../components/ui/ChaosGoldToast';
import type { GoldToastItem } from '../components/ui/ChaosGoldToast';
import type { MoveResult } from '../engine/chessLogic';
import {
  buildChaosFen,
  resolveArmyAfterBattle,
  pieceStartingSquare,
  findPieceSquare,
  findAllPieceSquares,
  getBerserkQueenMove,
  getGuardRookMove,
  spawnKnightOnKingMove,
  CHAOS_BATTLE_ELO,
  CHAOS_GOLD,
  CHAOS_FORK_BONUS,
  CHAOS_BLITZ_MOVE_LIMIT,
  type ChaosBattleNumber,
  type BossMoveCandidate,
} from '../engine/chaosBattle';
import { calcCaptureScore } from '../engine/scoreEngine';
import {
  processPlayerMove,
  berserkStreakBonus,
  guardSurvivalBonus,
  isProvocateurThreatened,
} from '../engine/chaosUpgradeEngine';
import type { PieceUpgrade } from '../types/chaos';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import { useChaosModeStore } from '../store/chaosModeStore';
import { eloToSkillLevel } from '../engine/stockfish';
import { shouldTriggerEvent, rollChaosEvent, parsePieceId } from '../engine/chaosEventEngine';

// Бонус золота за «ключевые» взятия — независимо от улучшений (попап в правом верхнем углу);
// пешки не учитываются (см. ЗАДАЧА 3 спецификации режима ХАОС)
const KEY_CAPTURE_PIECES: PieceSymbol[] = ['n', 'b', 'r', 'q'];

// Страж награждает каждые 5 ходов выживания (см. guardSurvivalBonus в движке улучшений)
const GUARD_TRIGGER_TURNS = 5;
// Динамическая подсветка Стража: цикл по turnsAlive % 5 — нарастает к награде на 5-м ходу, затем сброс
const GUARD_HIGHLIGHT_OPACITY = [0.10, 0.20, 0.30, 0.40, 0.60];
// Подсветка Засады: 0/1/2 хода на месте → 0.10/0.20/0.30, 3+ хода → 0.50 (готова удвоить золото за взятие)
const AMBUSH_HIGHLIGHT_OPACITY = [0.10, 0.20, 0.30, 0.50];

const PIECE_DISPLAY_NAME: Record<PieceSymbol, string> = {
  k: 'Король', q: 'Ферзь', r: 'Ладья', b: 'Слон', n: 'Конь', p: 'Пешка',
};

function upgradeBonusGold(upgradeType: PieceUpgrade['upgradeType']): number {
  return UPGRADE_DEFINITIONS.find(d => d.type === upgradeType)?.bonusGold ?? 0;
}

function upgradeName(upgradeType: PieceUpgrade['upgradeType']): string {
  return UPGRADE_DEFINITIONS.find(d => d.type === upgradeType)?.name ?? upgradeType;
}

// Русское склонение слова «ход» по числу: 1 ход, 2-4 хода, 5+ ходов
function turnsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ход';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'хода';
  return 'ходов';
}

// Счётчик призывов коней боссом «Всадник» — отображается под заголовком финального боя
function knightSpawnCounterText(spawnsLeft: number): string {
  return spawnsLeft > 0 ? `⚔️ Призывов осталось: ${spawnsLeft}` : '⚔️ Кони закончились';
}

// Текст попапа за серию взятий Берсерка — золото берётся из berserkStreakBonus,
// число огоньков растёт до серии 4 и дальше не увеличивается (серия 4+ → 🔥🔥🔥)
function berserkStreakPopupText(streak: number, bonus: number): string {
  const fireCount = Math.min(Math.max(streak - 1, 0), 3);
  const fire = fireCount > 0 ? ` ${'🔥'.repeat(fireCount)}` : '';
  return `+${bonus} золота — Берсерк${fire}`;
}

const PLAYER_COLOR = 'w' as const;

const BATTLE_TITLES: Record<ChaosBattleNumber, string> = {
  1: '⚔️ Бой 1',
  2: '⚔️ Бой 2',
  boss: '👑 Финальный бой — Всадник',
};

const BATTLE_GOALS: Record<ChaosBattleNumber, string> = {
  1: 'Поставь мат сопернику',
  2: 'Армия соперника усилена — действуй решительно',
  boss: 'Финальный бой. Удачи!',
};

// На каком этаже башни проходит какой бой (currentFloor: 1 → бой 1, 3 → бой 2, 5 → босс)
function battleNumberForFloor(floor: number): ChaosBattleNumber | null {
  switch (floor) {
    case 1: return 1;
    case 3: return 2;
    case 5: return 'boss';
    default: return null;
  }
}

// Состояние улучшённой фигуры в текущем бою — клетка, счётчик «ходов на месте» (Засада)
// и счётчик «ходов выживания» (Страж). Хранится локально — обнуляется с началом каждого боя.
interface UpgradeRuntimeState {
  square: Square | null; // null — фигура взята
  turnsOnPosition: number;
  turnsAlive: number;
}

const KNIGHT_OFFSETS: [number, number][] = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];

// Вилка конём — атакует 2+ фигуры противника одновременно с клетки `square`
function isKnightFork(chess: Chess, square: Square): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10) - 1;
  let attacked = 0;
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = file + df;
    const r = rank + dr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
    const piece = chess.get(sq);
    if (piece && piece.color !== PLAYER_COLOR) attacked += 1;
  }
  return attacked >= 2;
}

export default function ChaosBattleScreen() {
  const router = useRouter();
  const {
    currentFloor, pieces, purchasedPieces, pieceUpgrades, artifacts, selectedCharacter,
    addGold, addScore, setPieces, savePurchasedPieces, nextFloor, unlockGuardian,
    bossKnightSpawnsLeft, setBossKnightSpawnsLeft,
    cursedPieceId, clearCursedPiece,
  } = useChaosModeStore();

  // Каждые guardTriggerTurns ходов выживания срабатывает Страж — у персонажа «Страж» порог ниже стандартного
  const guardTriggerTurns = selectedCharacter?.guardTriggerTurns ?? GUARD_TRIGGER_TURNS;

  const battleNumber = battleNumberForFloor(currentFloor);
  const safeBattleNumber: ChaosBattleNumber = battleNumber ?? 1;
  const opponentElo = CHAOS_BATTLE_ELO[safeBattleNumber];
  const skillLevel = eloToSkillLevel(opponentElo);

  const [startFen] = useState(() => buildChaosFen(pieces, safeBattleNumber));
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);

  const [goldDisplay, setGoldDisplay] = useState(0);
  const [spawnedSquare, setSpawnedSquare] = useState<Square | null>(null);
  const [goldToasts, setGoldToasts] = useState<GoldToastItem[]>([]);
  // Баннер «Кони закончились!» — показывается на 1с, когда счётчик призывов босса достигает 0
  const [showKnightsOutBanner, setShowKnightsOutBanner] = useState(false);
  const goldRef = useRef(0);
  const finalGoldRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upgradeStateRef = useRef<Map<string, UpgradeRuntimeState>>(new Map());
  // Серия взятий подряд Берсерком — ключ: id улучшения, значение: длина текущей серии
  const berserkStreakRef = useRef<Record<string, number>>({});
  // Страж: клетка фигуры на конец предыдущего хода и счётчик ходов БЕЗ движения — ключ: id улучшения.
  // Сравниваем текущую клетку с записанной, чтобы отличить «осталась на месте» от «вернулась туда же» —
  // в обоих случаях клетка совпадает, считаем это «не двигалась» (ровно по спецификации Стража).
  const guardPositionsRef = useRef<Record<string, Square>>({});
  const guardTurnsRef = useRef<Record<string, number>>({});
  const goldToastIdRef = useRef(0);
  // Проклятие: текущая клетка проклятой фигуры — обновляется после каждого хода
  const cursedSquareRef = useRef<Square | null>(null);

  // Показывает золотой попап в правом верхнем углу — стекается с предыдущими, исчезает через 1.5с
  const pushGoldToast = useCallback((text: string) => {
    const id = goldToastIdRef.current++;
    setGoldToasts(prev => [...prev, { id, text }]);
  }, []);

  const removeGoldToast = useCallback((id: number) => {
    setGoldToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Анимация появления заспавненной фигуры длится 0.5с — снимаем подсветку чуть позже
  useEffect(() => {
    if (!spawnedSquare) return;
    const timer = setTimeout(() => setSpawnedSquare(null), 600);
    return () => clearTimeout(timer);
  }, [spawnedSquare]);

  // Баннер «Кони закончились!» показываем 1 секунду, затем прячем
  useEffect(() => {
    if (!showKnightsOutBanner) return;
    const timer = setTimeout(() => setShowKnightsOutBanner(false), 1000);
    return () => clearTimeout(timer);
  }, [showKnightsOutBanner]);

  useEffect(() => {
    savePurchasedPieces();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  }, []);

  // Расставляем улучшённые фигуры по их стартовым клеткам — pieceIndex соответствует
  // порядку фигур этого типа в массиве армии (см. buildPlayerBoard / pieceStartingSquare)
  useEffect(() => {
    const map = new Map<string, UpgradeRuntimeState>();
    const guardPositions: Record<string, Square> = {};
    for (const upgrade of pieceUpgrades) {
      const square = pieceStartingSquare(upgrade.pieceType, upgrade.pieceIndex);
      map.set(upgrade.id, {
        square,
        turnsOnPosition: 0,
        turnsAlive: 0,
      });
      if (upgrade.upgradeType === 'guard' && square) guardPositions[upgrade.id] = square;
    }
    upgradeStateRef.current = map;
    berserkStreakRef.current = {};
    guardPositionsRef.current = guardPositions;
    guardTurnsRef.current = {};

    // Инициализируем стартовую клетку проклятой фигуры (если есть проклятие на этот бой)
    if (cursedPieceId) {
      const { pieceType, pieceIndex } = parsePieceId(cursedPieceId);
      cursedSquareRef.current = pieceStartingSquare(pieceType, pieceIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновляет позиции улучшенных фигур после хода (своего или соперника):
  // снимает «взятые» (оказались на клетке `to`) и переносит сдвинувшуюся фигуру на `to`
  function trackUpgradeMove(from: Square, to: Square) {
    const states = upgradeStateRef.current;
    for (const state of states.values()) {
      if (state.square === to) state.square = null;
    }
    for (const state of states.values()) {
      if (state.square === from) {
        state.square = to;
        state.turnsOnPosition = 0;
      }
    }
    // Обновляем клетку проклятой фигуры — она взята, если оказалась на «to»
    if (cursedSquareRef.current === to) cursedSquareRef.current = null;
    if (cursedSquareRef.current === from) cursedSquareRef.current = to;
  }

  // Раз за ход игрока — продлеваем счётчики живым улучшенным фигурам:
  // turnsOnPosition (Засада — стояние на месте) и turnsAlive (Страж — выживание)
  function tickUpgradeCounters() {
    for (const state of upgradeStateRef.current.values()) {
      if (state.square !== null) {
        state.turnsOnPosition += 1;
        state.turnsAlive += 1;
      }
    }
  }

  // Снимок улучшений с актуальными счётчиками — для передачи в processPlayerMove
  function liveUpgrades(): PieceUpgrade[] {
    return pieceUpgrades.map(u => {
      const state = upgradeStateRef.current.get(u.id);
      return state ? { ...u, turnsOnPosition: state.turnsOnPosition, turnsAlive: state.turnsAlive } : u;
    });
  }

  // Берсерк: серия взятий подряд именно этой фигурой. Проверяем ДО обновления позиций —
  // нужно знать клетку, с которой фигура ходила в этот раз (move.from)
  function checkBerserkStreak(move: Move) {
    for (const upgrade of pieceUpgrades) {
      if (upgrade.upgradeType !== 'berserk') continue;
      const state = upgradeStateRef.current.get(upgrade.id);
      if (!state || state.square !== move.from) continue;
      if (move.captured) {
        const streak = (berserkStreakRef.current[upgrade.id] ?? 0) + 1;
        berserkStreakRef.current[upgrade.id] = streak;
        const bonus = berserkStreakBonus(streak, selectedCharacter?.berserkStreakStartBonus);
        goldRef.current += bonus;
        pushGoldToast(berserkStreakPopupText(streak, bonus));
      } else {
        berserkStreakRef.current[upgrade.id] = 0;
      }
    }
  }

  // Страж: награда за каждые guardTriggerTurns ходов БЕЗ движения фигуры (не за выживание!).
  // Сравниваем клетку с записанной на конце предыдущего хода: сдвинулась — счётчик в 0,
  // осталась на месте — +1; при достижении кратного guardTriggerTurns начисляем золото.
  function checkGuardBonus() {
    for (const upgrade of pieceUpgrades) {
      if (upgrade.upgradeType !== 'guard') continue;
      const state = upgradeStateRef.current.get(upgrade.id);
      if (!state?.square) continue;

      const prevSquare = guardPositionsRef.current[upgrade.id];
      guardPositionsRef.current[upgrade.id] = state.square;
      if (prevSquare !== state.square) {
        guardTurnsRef.current[upgrade.id] = 0;
        continue;
      }

      const turns = (guardTurnsRef.current[upgrade.id] ?? 0) + 1;
      guardTurnsRef.current[upgrade.id] = turns;
      const bonus = guardSurvivalBonus(turns, guardTriggerTurns);
      if (bonus > 0) {
        goldRef.current += bonus;
        pushGoldToast(`+${bonus} золота — Страж`);
      }
    }
  }

  // Провокатор: проверяется после КАЖДОГО хода ИИ — если фигура стоит под атакой чёрных, начисляем золото
  function checkProvocateurBonus() {
    for (const upgrade of pieceUpgrades) {
      if (upgrade.upgradeType !== 'provocateur') continue;
      const state = upgradeStateRef.current.get(upgrade.id);
      if (!state?.square || !isProvocateurThreatened(chess, state.square)) continue;
      const bonus = upgradeBonusGold('provocateur');
      goldRef.current += bonus;
      pushGoldToast(`+${bonus} золота — Провокатор`);
    }
  }

  // Подсветка клеток улучшенных фигур игрока:
  // Берсерк/Снайпер/Провокатор — красная, фиксированная opacity 0.35;
  // Страж — синяя, цикличная по числу ходов БЕЗ движения (нарастает к награде на guardTriggerTurns-м ходу);
  // Засада — синяя, по числу ходов на месте (0/1/2/3+ → 0.10/0.20/0.30/0.50, «готова удвоить золото»).
  // Пересчитывается на каждый ход (boardKey).
  const upgradeHighlights = pieceUpgrades.reduce<{ square: Square; color: 'red' | 'blue' | 'gold' | 'purple'; opacity: number }[]>((acc, upgrade) => {
    const state = upgradeStateRef.current.get(upgrade.id);
    if (!state?.square) return acc;
    switch (upgrade.upgradeType) {
      case 'guard': {
        const guardTurns = guardTurnsRef.current[upgrade.id] ?? 0;
        acc.push({ square: state.square, color: 'blue', opacity: GUARD_HIGHLIGHT_OPACITY[guardTurns % GUARD_HIGHLIGHT_OPACITY.length] });
        break;
      }
      case 'ambush':
        acc.push({ square: state.square, color: 'blue', opacity: AMBUSH_HIGHLIGHT_OPACITY[Math.min(state.turnsOnPosition, AMBUSH_HIGHLIGHT_OPACITY.length - 1)] });
        break;
      default:
        acc.push({ square: state.square, color: 'red', opacity: 0.35 });
        break;
    }
    return acc;
  }, []);

  // Проклятие: пурпурная (#9333EA) подсветка проклятой фигуры
  const cursedSquare = cursedSquareRef.current;
  if (cursedSquare) {
    upgradeHighlights.push({ square: cursedSquare, color: 'purple', opacity: 0.55 });
  }

  // Берсерк: если хотя бы одна берсерк-фигура игрока может взять — она обязана это сделать.
  // Возвращает клетки и список разрешённых ходов (LAN), которые ChessBoard примет как форсированные.
  const berserkForce = (() => {
    if (chess.turn() !== PLAYER_COLOR || pieceUpgrades.length === 0) return null;
    const forcedSquares: Square[] = [];
    const forcedMoves: string[] = [];
    for (const upgrade of pieceUpgrades) {
      if (upgrade.upgradeType !== 'berserk') continue;
      const state = upgradeStateRef.current.get(upgrade.id);
      if (!state?.square) continue;
      const captures = chess.moves({ square: state.square, verbose: true }).filter(m => m.captured);
      if (captures.length === 0) continue;
      forcedSquares.push(state.square);
      for (const m of captures) forcedMoves.push(`${m.from}${m.to}${m.promotion ?? ''}`);
    }
    return forcedSquares.length > 0 ? { forcedSquares, forcedMoves } : null;
  })();

  // Панель улучшений под доской — строки для живых улучшённых фигур со статусом по типу.
  // Пересчитывается на каждый ход (boardKey).
  const upgradePanelLines = pieceUpgrades.reduce<{ icon: string; text: string }[]>((acc, upgrade) => {
    const state = upgradeStateRef.current.get(upgrade.id);
    if (!state?.square) return acc;
    const icon = upgrade.category === 'attack' ? '🔴' : '🔵';
    const label = `${PIECE_DISPLAY_NAME[upgrade.pieceType]} ${upgrade.pieceIndex + 1}`;
    let suffix = '';
    if (upgrade.upgradeType === 'berserk') {
      const streak = berserkStreakRef.current[upgrade.id] ?? 0;
      if (streak > 0) suffix = ` (серия: ${streak})`;
    } else if (upgrade.upgradeType === 'guard') {
      const guardTurns = guardTurnsRef.current[upgrade.id] ?? 0;
      const step = guardTurns % guardTriggerTurns;
      suffix = ` (без движения: ${step === 0 && guardTurns > 0 ? guardTriggerTurns : step}/${guardTriggerTurns})`;
    } else if (upgrade.upgradeType === 'ambush') {
      suffix = ` (на месте: ${state.turnsOnPosition} ${turnsWord(state.turnsOnPosition)})`;
    }
    acc.push({ icon, text: `${label} — ${upgradeName(upgrade.upgradeType)}${suffix}` });
    return acc;
  }, []);

  // Проклятие: ходы проклятой фигуры, захватывающие ценные фигуры (n/b/r/q), блокируются.
  // Объединяем с берсерком: если берсерк активен — фильтруем его список; иначе строим allMoves.
  const activeForcedMoves: string[] | undefined = (() => {
    const CURSE_BLOCKED: Partial<Record<PieceSymbol, boolean>> = { n: true, b: true, r: true, q: true };
    const filterCurse = (lans: string[]): string[] => {
      if (!cursedSquare) return lans;
      return lans.filter(lan => {
        if (!lan.startsWith(cursedSquare)) return true;
        const toSq = lan.slice(2, 4) as Square;
        const target = chess.get(toSq);
        return !target || !CURSE_BLOCKED[target.type];
      });
    };

    if (berserkForce) {
      return filterCurse(berserkForce.forcedMoves);
    }
    if (cursedSquare) {
      const allVerbose = chess.moves({ verbose: true }).filter(m => m.color === 'w');
      const filtered = filterCurse(allVerbose.map(m => `${m.from}${m.to}${m.promotion ?? ''}`));
      // Только если хотя бы один ход был заблокирован — иначе undefined (без ограничений)
      return filtered.length < allVerbose.length ? filtered : undefined;
    }
    return undefined;
  })();

  // Подсветка ключевых фигур босса «Всадник»: ферзь-берсерк — красным, король-спавнер коней — золотым.
  // Защитные улучшения боссу не нужны (ладья-страж не подсвечивается). Видна с первого хода игрока.
  const bossHighlights: typeof upgradeHighlights = [];
  if (safeBattleNumber === 'boss') {
    for (const square of findAllPieceSquares(chess, 'q', 'b')) {
      bossHighlights.push({ square, color: 'red', opacity: 0.35 });
    }
    const bossKingSquare = findPieceSquare(chess, 'k', 'b');
    if (bossKingSquare) bossHighlights.push({ square: bossKingSquare, color: 'gold', opacity: 0.45 });
  }

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  // Итог боя: золото начисляется только при победе (как и очки в остальных режимах башни);
  // артефакт «Блиц-мастер» удваивает итоговое золото при победе за CHAOS_BLITZ_MOVE_LIMIT ходов и меньше
  function finishBattle(r: 'win' | 'lose' | 'draw', reason: string, outcomeGold: number, movesUsed: number) {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    let total = 0;
    if (r === 'win') {
      total = goldRef.current + outcomeGold;
      if (artifacts.includes('blitz_master') && movesUsed <= CHAOS_BLITZ_MOVE_LIMIT) total *= 2;
    }
    finalGoldRef.current = total;
    setGoldDisplay(total);
    setResult(r);
    setResultReason(reason);
  }

  const applyAIMove = useCallback((uci: string) => {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    let candidate: BossMoveCandidate = {
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci[4] as PieceSymbol | undefined,
    };

    // Босс «Всадник»: ферзь-берсерк форсирует взятие, ладья-страж не уходит от короля
    if (safeBattleNumber === 'boss') {
      candidate = getGuardRookMove(chess, getBerserkQueenMove(chess, candidate));
    }

    const { from, to, promotion } = candidate;
    try {
      const move = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }
      if (pieceUpgrades.length > 0) {
        trackUpgradeMove(from, to);
        // Провокатор: после хода ИИ проверяем, не оказалась ли фигура под атакой чёрных
        checkProvocateurBonus();
        setGoldDisplay(goldRef.current);
      }
      // Босс «Всадник»: каждый ход королём — новый конь на случайной клетке рядов 5-8,
      // появляется с плавным проявлением (анимация в ChessBoard через spawnedSquare).
      // Лимит призывов — bossKnightSpawnsLeft, проверяем ДО мутации доски в spawnKnightOnKingMove
      if (safeBattleNumber === 'boss' && bossKnightSpawnsLeft > 0) {
        const spawnSquare = spawnKnightOnKingMove(chess, move);
        if (spawnSquare) {
          setSpawnedSquare(spawnSquare);
          const remaining = bossKnightSpawnsLeft - 1;
          setBossKnightSpawnsLeft(remaining);
          if (remaining === 0) setShowKnightsOutBanner(true);
        }
      }
      setOpponentLastMove({ from, to });
      setBoardKey(k => k + 1);
      setIsAIThinking(false);

      if (chess.isCheckmate()) {
        finishBattle('lose', 'Мат!', 0, playerMoves);
        return;
      }
      if (chess.isDraw() || chess.isStalemate()) {
        finishBattle('draw', 'Ничья — золото не начисляется', 0, playerMoves);
        return;
      }
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, playerMoves, pieceUpgrades]);

  const requestAIMove = useCallback(() => {
    if (chess.isGameOver() || chess.turn() === PLAYER_COLOR) return;
    setIsAIThinking(true);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      aiTimeoutRef.current = null;
      if (chess.turn() === PLAYER_COLOR || chess.isGameOver()) return;
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return;
      const m = moves[Math.floor(Math.random() * moves.length)];
      applyAIMove(`${m.from}${m.to}${m.promotion ?? ''}`);
    }, 1500);
    sendToEngine(`position fen ${chess.fen()}`);
    sendToEngine('go movetime 400');
  }, [chess, applyAIMove, sendToEngine]);

  const handleEngineMessage = useCallback((line: string) => {
    if (!line.startsWith('bestmove')) return;
    const uci = line.split(' ')[1];
    if (!uci || uci === '0000') { setIsAIThinking(false); return; }
    applyAIMove(uci);
  }, [applyAIMove]);

  useEffect(() => {
    if (engineReady && chess.turn() !== PLAYER_COLOR) requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  const handleMove = useCallback((moveResult: MoveResult) => {
    if (!moveResult.success || !moveResult.move) return;
    setOpponentLastMove(null);
    const newCount = playerMoves + 1;
    setPlayerMoves(newCount);
    setBoardKey(k => k + 1);

    const move = moveResult.move;
    if (move.captured) {
      goldRef.current += calcCaptureScore(move.captured);
      // Ключевое взятие (конь/слон/ладья/ферзь) — попап с золотом независимо от улучшений; пешки не показываем
      if (KEY_CAPTURE_PIECES.includes(move.captured)) {
        pushGoldToast(`+${calcCaptureScore(move.captured)} золота`);
      }
      // Купец: дополнительное золото за каждое взятие — независимо от типа взятой фигуры
      if (selectedCharacter && selectedCharacter.captureGoldBonus > 0) {
        goldRef.current += selectedCharacter.captureGoldBonus;
        pushGoldToast(`+${selectedCharacter.captureGoldBonus} золота — Купец`);
      }
    }
    if (move.piece === 'n' && artifacts.includes('fork_master') && isKnightFork(chess, move.to as Square)) {
      goldRef.current += CHAOS_FORK_BONUS;
    }
    if (pieceUpgrades.length > 0) {
      // Снайпер и Засада оцениваются по состоянию ДО обновления счётчиков —
      // turnsOnPosition должен отражать, сколько ходов фигура простояла на клетке, с которой берёт
      for (const trigger of processPlayerMove(move, liveUpgrades())) {
        goldRef.current += trigger.bonus;
        pushGoldToast(`+${trigger.bonus} золота — ${upgradeName(trigger.upgradeType)}`);
      }
      // Берсерк: определяем серию по клетке ДО хода — тоже до обновления позиций
      checkBerserkStreak(move);
      trackUpgradeMove(move.from as Square, move.to as Square);
      tickUpgradeCounters();
      // Страж: сравниваем клетку ПОСЛЕ обновления позиций — этот ход уже отражён в state.square
      checkGuardBonus();
    }
    setGoldDisplay(goldRef.current);

    if (moveResult.isCheckmate) {
      const mateGold = newCount <= 10 ? CHAOS_GOLD.mateUnder10 : CHAOS_GOLD.mate11to20;
      // Победа над боссом «Всадник» открывает персонажа «Страж» — сохраняется между сессиями
      if (safeBattleNumber === 'boss') unlockGuardian();
      finishBattle('win', 'Мат противнику!', mateGold, newCount);
      return;
    }
    if (moveResult.isDraw || moveResult.isStalemate) {
      finishBattle('draw', 'Ничья — золото не начисляется', 0, newCount);
      return;
    }

    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove, artifacts, pieceUpgrades, selectedCharacter]);

  function handleContinue() {
    // Превращённые во время боя ферзи возвращаются пешками — переходит только купленная армия
    setPieces(resolveArmyAfterBattle(chess.fen(), purchasedPieces));
    // addScore всегда вызывается ровно раз за бой (даже с 0), чтобы floorScores[i]
    // оставался выровнен по номеру боя для разбивки на экране победы
    if (finalGoldRef.current > 0) addGold(finalGoldRef.current);
    addScore(finalGoldRef.current);
    nextFloor();
    // Проклятие действует ровно один бой — снимаем после его завершения
    clearCursedPiece();

    // Случайное событие после обычных боёв (не после босса) — 60% вероятность
    if (safeBattleNumber !== 'boss') {
      const store = useChaosModeStore.getState();
      if (shouldTriggerEvent()) {
        const eventId = rollChaosEvent({
          lastEventWasNegative: store.lastEventWasNegative,
          pieces: store.pieces,
          gold: store.gold,
          pieceUpgrades: store.pieceUpgrades,
        });
        router.replace(`/chaos-event?eventId=${eventId}`);
        return;
      }
    }
    router.replace('/chaos-tower');
  }

  function handleExit() {
    Alert.alert('Выйти из боя?', 'Прогресс забега будет потерян.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { useChaosModeStore.getState().resetRun(); router.replace('/chaos-character-select'); } },
    ]);
  }

  // Хуки уже объявлены — теперь можно безопасно делать условный return
  if (battleNumber === null) { router.replace('/chaos-tower'); return null; }

  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{BATTLE_TITLES[safeBattleNumber]}</Text>
          {safeBattleNumber === 'boss' && (
            <Text style={styles.knightCounter}>{knightSpawnCounterText(bossKnightSpawnsLeft)}</Text>
          )}
        </View>
        <Pressable style={styles.exitBtn} onPress={handleExit} testID="chaos-battle-exit-btn">
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <Text style={styles.goldBadge}>💰 {goldDisplay}</Text>
        <Text style={[styles.thinking, { opacity: isAIThinking ? 1 : 0 }]}>⏳</Text>
      </View>

      <View style={styles.boardWrap}>
        <ChessBoard
          key={boardKey}
          chess={chess}
          playerColor={PLAYER_COLOR}
          onMove={handleMove}
          disabled={boardDisabled}
          opponentLastMove={opponentLastMove}
          upgradeHighlights={[...upgradeHighlights, ...bossHighlights]}
          spawnedSquare={spawnedSquare}
          forcedSquares={berserkForce?.forcedSquares}
          forcedMoves={activeForcedMoves}
        />
        <ChaosGoldToastStack items={goldToasts} onExpire={removeGoldToast} />
        {showKnightsOutBanner && (
          <View style={styles.knightsOutBanner} pointerEvents="none">
            <Text style={styles.knightsOutBannerText}>Кони закончились!</Text>
          </View>
        )}
      </View>

      {pieceUpgrades.length > 0 && (
        <View style={styles.upgradePanel} testID="chaos-upgrade-panel">
          {upgradePanelLines.map((line, i) => (
            <Text key={i} style={styles.upgradePanelLine} numberOfLines={1}>
              {line.icon} {line.text}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.goal}>{BATTLE_GOALS[safeBattleNumber]}</Text>
      </View>

      {result && (
        <View style={styles.overlay}>
          <Text style={styles.resultEmoji}>
            {result === 'win' ? '🏆' : result === 'lose' ? '💀' : '🤝'}
          </Text>
          <Text style={styles.resultTitle}>
            {result === 'win' ? 'Победа!' : result === 'lose' ? 'Поражение' : 'Ничья'}
          </Text>
          <Text style={styles.resultReason}>{resultReason}</Text>
          <Text style={styles.resultGold}>+{finalGoldRef.current} 💰</Text>
          <Pressable style={styles.continueBtn} onPress={handleContinue} testID="chaos-battle-continue-btn">
            <Text style={styles.continueBtnText}>Продолжить</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#0d1117' },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  titleBlock:      { flex: 1 },
  title:           { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  knightCounter:   { color: '#FF4444', fontSize: 12, fontWeight: '700', marginTop: 2 },
  exitBtn:         { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:     { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  goldBadge:       { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  thinking:        { fontSize: 20 },
  boardWrap:       { flex: 1 },
  knightsOutBanner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: '#FF4444', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', zIndex: 50,
  },
  knightsOutBannerText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  upgradePanel:    { height: 92, paddingHorizontal: 16, paddingVertical: 6, justifyContent: 'flex-start' },
  upgradePanelLine:{ color: '#94a3b8', fontSize: 11, lineHeight: 15 },
  footer:          { paddingHorizontal: 16, paddingVertical: 8 },
  goal:            { color: '#64748b', fontSize: 12, textAlign: 'center' },
  overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resultEmoji:     { fontSize: 72 },
  resultTitle:     { color: '#fff', fontSize: 32, fontWeight: '900' },
  resultReason:    { color: '#94a3b8', fontSize: 16 },
  resultGold:      { color: '#f59e0b', fontSize: 28, fontWeight: '800' },
  continueBtn:     { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
