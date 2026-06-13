import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  buildLevel2AiFen,
  buildLevel2BossAiFen,
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
import { applyAIUpgrades, evolvePiece, teleportAttackingPieces, type AIUpgrade } from '../engine/chaosAIUpgrades';
import type { PieceUpgrade } from '../types/chaos';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import { LEVEL_CONFIGS, getBattleConfig } from '../data/chaosLevelConfig';
import { getTowerNodes } from '../data/chaosTowerConfig';
import { useChaosModeStore } from '../store/chaosModeStore';
import { eloToSkillLevel } from '../engine/stockfish';
import { parsePieceId } from '../engine/chaosEventEngine';

// Бонус золота за «ключевые» взятия — независимо от улучшений (попап в правом верхнем углу);
// пешки не учитываются (см. ЗАДАЧА 3 спецификации режима ХАОС)
const KEY_CAPTURE_PIECES: PieceSymbol[] = ['n', 'b', 'r', 'q'];

// Страж награждает каждые 5 ходов выживания (см. guardSurvivalBonus в движке улучшений)
const GUARD_TRIGGER_TURNS = 5;

// Лимит призывов коней боссом «Всадник» (уровень 1)
const BOSS_KNIGHT_SPAWNS_LEVEL1 = 5;

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

// Координаты доски рисуются снаружи ChessBoard — игрок всегда играет белыми (PLAYER_COLOR),
// поэтому порядок цифр/букв фиксирован (вид с белой стороны)
const RANK_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const FILE_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const COORD_COLUMN_WIDTH = 14;

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
    currentFloor, currentLevel, chosenPath, pieces, purchasedPieces, pieceUpgrades, artifacts, selectedCharacter,
    addGold, addScore, setPieces, savePurchasedPieces, nextFloor, unlockGuardian,
    bossKnightSpawnsLeft, setBossKnightSpawnsLeft,
    cursedPieceId, clearCursedPiece,
  } = useChaosModeStore();

  // Каждые guardTriggerTurns ходов выживания срабатывает Страж — у персонажа «Страж» порог ниже стандартного
  const guardTriggerTurns = selectedCharacter?.guardTriggerTurns ?? GUARD_TRIGGER_TURNS;

  // Уровень 1 проходит по старой логике без изменений (battleNumberForFloor → 1|2|'boss')
  const battleNumber = currentLevel === 1 ? battleNumberForFloor(currentFloor) : null;
  const safeBattleNumber: ChaosBattleNumber = battleNumber ?? 1;

  // Уровень 2+: узел текущего этажа определяет конфигурацию боя из LEVEL_CONFIGS;
  // для узла выбора маршрута (choice) индекс боя берётся из chosenPath
  const towerNodes = getTowerNodes(currentLevel);
  const node = towerNodes[currentFloor];
  const levelConfig = LEVEL_CONFIGS[currentLevel - 1];
  const battleKey: number | 'elite' | 'boss' | null = (() => {
    if (!node) return null;
    if (node.type === 'choice') return chosenPath;
    return node.battleIndex ?? null;
  })();
  const battleConfig = currentLevel !== 1 && levelConfig && battleKey !== null
    ? getBattleConfig(levelConfig, battleKey)
    : null;

  const isValidFloor = currentLevel === 1 ? battleNumber !== null : battleKey !== null;

  const isBossBattle = currentLevel === 1 ? safeBattleNumber === 'boss' : battleKey === 'boss';
  const opponentElo = currentLevel === 1 ? CHAOS_BATTLE_ELO[safeBattleNumber] : (battleConfig?.elo ?? 1000);
  const skillLevel = eloToSkillLevel(opponentElo);
  const aiUpgrades: AIUpgrade[] = battleConfig?.aiUpgrades ?? [];

  const [startFen] = useState(() => {
    if (currentLevel === 1) return buildChaosFen(pieces, safeBattleNumber);
    if (isBossBattle) return buildLevel2BossAiFen(pieces);
    return buildLevel2AiFen(pieces, aiUpgrades);
  });
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);

  // Доска по центру между HUD сверху и панелью снизу — высоты HUD/панели измеряются
  // через onLayout, размер доски = минимум из ширины экрана и доступной высоты
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);
  const availableHeight = screenHeight - headerHeight - bottomHeight;
  const boardSize = Math.max(0, Math.min(screenWidth - 40 - COORD_COLUMN_WIDTH, availableHeight));
  const cellSize = boardSize / 8;
  const [playerMoves, setPlayerMoves] = useState(0);
  // Уровень 2+, босс с эволюцией: сколько ходов осталось до следующей эволюции фигуры ИИ
  const [movesUntilEvolution, setMovesUntilEvolution] = useState(levelConfig?.bossConfig?.evolutionMechanic?.intervalMoves ?? 5);
  // Уровень 3, Ведьма Диагоналей: сколько ходов осталось до следующей телепортации атакующих фигур
  const [movesUntilTeleport, setMovesUntilTeleport] = useState(levelConfig?.bossConfig?.teleportMechanic?.intervalMoves ?? 5);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');
  // Подсветка клеток последнего хода (своего или ИИ) — цвет зависит от того, кто ходил
  const [lastMoveHighlight, setLastMoveHighlight] = useState<{ from: Square; to: Square; color: 'player' | 'opponent' } | null>(null);

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

  // Сбрасываем счётчик призывов коней боссом «Всадник» (уровень 1) на стартовый лимит
  useEffect(() => {
    if (!isBossBattle || currentLevel !== 1) return;
    setBossKnightSpawnsLeft(BOSS_KNIGHT_SPAWNS_LEVEL1);
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

  // Подсветка клеток улучшенных фигур игрока — все статичные:
  // атака (берсерк/снайпер/провокатор) — красная 0.35, защита (страж/засада) — синяя 0.35.
  const upgradeHighlights = pieceUpgrades.reduce<{ square: Square; color: 'red' | 'blue' | 'gold' | 'purple'; opacity: number }[]>((acc, upgrade) => {
    const state = upgradeStateRef.current.get(upgrade.id);
    if (!state?.square) return acc;
    const color = upgrade.category === 'attack' ? 'red' : 'blue';
    acc.push({ square: state.square, color, opacity: 0.35 });
    return acc;
  }, []);

  // Проклятие: пурпурная (#9333EA) подсветка проклятой фигуры
  const cursedSquare = cursedSquareRef.current;
  if (cursedSquare) {
    upgradeHighlights.push({ square: cursedSquare, color: 'purple', opacity: 0.45 });
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
  if (currentLevel === 1 && safeBattleNumber === 'boss') {
    for (const square of findAllPieceSquares(chess, 'q', 'b')) {
      bossHighlights.push({ square, color: 'red', opacity: 0.35 });
    }
  }
  // Король босса всегда подсвечен золотым (#FFD700, 0.45) — единая система подсветки для всех уровней
  if (isBossBattle) {
    const bossKingSquare = findPieceSquare(chess, 'k', 'b');
    if (bossKingSquare) bossHighlights.push({ square: bossKingSquare, color: 'gold', opacity: 0.45 });
  }

  // Уровень 2+: симметрия — улучшения ИИ подсвечиваются так же, как у игрока:
  // Берсерк/Снайпер — красным (#FF4444), Страж — синим (#4444FF), opacity 0.35.
  const currentAiUpgrades: AIUpgrade[] = currentLevel === 1 ? [] : aiUpgrades;
  const aiUpgradeHighlights: typeof upgradeHighlights = (() => {
    if (currentAiUpgrades.length === 0) return [];
    const map = new Map<Square, { square: Square; color: 'red' | 'blue' | 'gold' | 'purple'; opacity: number }>();
    for (const upgrade of currentAiUpgrades) {
      const color = upgrade.upgradeType === 'guard' ? 'blue' : 'red';
      for (const square of findAllPieceSquares(chess, upgrade.pieceType, 'b')) {
        map.set(square, { square, color, opacity: 0.35 });
      }
    }
    return [...map.values()];
  })();

  // Панель улучшений противника — зеркало панели игрока: только живые улучшенные фигуры,
  // дубликаты типа+улучшения (например, 2x конь-Берсерк у Двуглавого Рыцаря) сворачиваются в одну строку.
  const aiUpgradePanelLines = (() => {
    if (currentAiUpgrades.length === 0) return [];
    const seen = new Set<string>();
    const lines: { icon: string; text: string }[] = [];
    for (const upgrade of currentAiUpgrades) {
      const key = `${upgrade.pieceType}_${upgrade.upgradeType}`;
      if (seen.has(key)) continue;
      if (findAllPieceSquares(chess, upgrade.pieceType, 'b').length === 0) continue;
      seen.add(key);
      const icon = upgrade.upgradeType === 'guard' ? '🔵' : '🔴';
      lines.push({ icon, text: `${PIECE_DISPLAY_NAME[upgrade.pieceType]} — ${upgradeName(upgrade.upgradeType)}` });
    }
    return lines;
  })();

  // Уровень 2+, босс «Двуглавый Рыцарь»: счётчик ходов до следующей эволюции фигуры ИИ
  const evolutionCounterText = currentLevel >= 2 && isBossBattle && levelConfig.bossConfig.evolutionMechanic
    ? `⚡ Эволюция через: ${movesUntilEvolution} ${turnsWord(movesUntilEvolution)}`
    : null;
  const evolutionCounterUrgent = movesUntilEvolution <= 2;

  // Уровень 3, «Ведьма Диагоналей»: счётчик ходов до следующей телепортации атакующих фигур
  const teleportCounterText = isBossBattle && levelConfig.bossConfig.teleportMechanic
    ? `🌀 Телепортация через: ${movesUntilTeleport} ${turnsWord(movesUntilTeleport)}`
    : null;
  const teleportCounterUrgent = movesUntilTeleport <= 2;

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

    // Уровень 2+: симметричные улучшения ИИ — Берсерк/Снайпер/Страж — переопределяют ход Stockfish
    const finalUci = currentLevel >= 2 && currentAiUpgrades.length > 0
      ? applyAIUpgrades(chess, uci, currentAiUpgrades)
      : uci;

    let candidate: BossMoveCandidate = {
      from: finalUci.slice(0, 2) as Square,
      to: finalUci.slice(2, 4) as Square,
      promotion: finalUci[4] as PieceSymbol | undefined,
    };

    // Босс «Всадник»: ферзь-берсерк форсирует взятие, ладья-страж не уходит от короля
    if (currentLevel === 1 && safeBattleNumber === 'boss') {
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
      if (currentLevel === 1 && safeBattleNumber === 'boss' && bossKnightSpawnsLeft > 0) {
        const spawnSquare = spawnKnightOnKingMove(chess, move);
        if (spawnSquare) {
          setSpawnedSquare(spawnSquare);
          const remaining = bossKnightSpawnsLeft - 1;
          setBossKnightSpawnsLeft(remaining);
          if (remaining === 0) setShowKnightsOutBanner(true);
        }
      }
      setLastMoveHighlight({ from, to, color: 'opponent' });

      // Уровень 3, Ведьма Диагоналей: раз в teleportMechanic.intervalMoves ходов
      // атакующие фигуры (слоны-снайперы, конь-берсерк) телепортируются на ряды 5-8
      if (isBossBattle && levelConfig.bossConfig.teleportMechanic) {
        const teleportMechanic = levelConfig.bossConfig.teleportMechanic;
        if (playerMoves > 0 && playerMoves % teleportMechanic.intervalMoves === 0) {
          const teleported = teleportAttackingPieces(chess, teleportMechanic.targetPieces, teleportMechanic.excludePieces);
          if (teleported !== chess) {
            chess.load(teleported.fen());
            pushGoldToast('🌀 Ведьма телепортировала своих воинов!');
          }
        }
        setMovesUntilTeleport(teleportMechanic.intervalMoves - (playerMoves % teleportMechanic.intervalMoves));
      }

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
  }, [chess, playerMoves, pieceUpgrades, currentLevel, currentAiUpgrades, isBossBattle, levelConfig, safeBattleNumber, bossKnightSpawnsLeft, pushGoldToast]);

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
    setLastMoveHighlight(null);
    const newCount = playerMoves + 1;
    setPlayerMoves(newCount);
    setBoardKey(k => k + 1);

    const move = moveResult.move;
    setLastMoveHighlight({ from: move.from as Square, to: move.to as Square, color: 'player' });
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

    // Уровень 2+, босс «Двуглавый Рыцарь»: раз в evolutionMechanic.intervalMoves ходов
    // случайная фигура ИИ эволюционирует по цепочке (см. evolvePiece)
    if (currentLevel >= 2 && isBossBattle && levelConfig.bossConfig.evolutionMechanic) {
      const evolutionMechanic = levelConfig.bossConfig.evolutionMechanic;
      if (newCount % evolutionMechanic.intervalMoves === 0) {
        const evolved = evolvePiece(chess, evolutionMechanic.maxQueens);
        if (evolved) {
          chess.load(evolved.fen());
          pushGoldToast('Фигура противника эволюционировала! 🔴');
        }
      }
      setMovesUntilEvolution(evolutionMechanic.intervalMoves - (newCount % evolutionMechanic.intervalMoves));
    }

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
    router.replace('/chaos-tower');
  }

  function handleExit() {
    Alert.alert('Выйти из боя?', 'Прогресс забега будет потерян.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { useChaosModeStore.getState().resetRun(); router.replace('/chaos-character-select'); } },
    ]);
  }

  // Хуки уже объявлены — теперь можно безопасно делать условный return
  if (!isValidFloor) { router.replace('/chaos-tower'); return null; }

  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  // Заголовок и цель боя: уровень 1 — фиксированные тексты по номеру боя;
  // уровень 2+ — по узлу башни (имя босса, «Элита» или название узла обычного боя)
  const battleTitle = currentLevel === 1
    ? BATTLE_TITLES[safeBattleNumber]
    : isBossBattle
      ? `👑 Финальный бой — ${levelConfig.bossConfig.name}`
      : battleKey === 'elite'
        ? '💀 Элита'
        : `⚔️ ${node?.label ?? 'Бой'}`;

  const battleGoal = currentLevel === 1
    ? BATTLE_GOALS[safeBattleNumber]
    : isBossBattle
      ? 'Финальный бой. Удачи!'
      : battleKey === 'elite'
        ? 'Сложный противник с улучшениями — действуй решительно'
        : 'Поставь мат сопернику';

  return (
    <LinearGradient colors={['#2a1f3d', '#1a1423']} start={{ x: 0.5, y: 0.3 }} end={{ x: 0.5, y: 1 }} style={styles.gradient}>
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{battleTitle}</Text>
          {currentLevel === 1 && isBossBattle && (
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
        <View style={styles.boardOuter}>
          <View style={styles.boardRow}>
            <View style={styles.rankColumn}>
              {RANK_LABELS.map(rank => (
                <Text key={rank} style={[styles.coordLabel, { width: COORD_COLUMN_WIDTH, height: cellSize, lineHeight: cellSize }]}>
                  {rank}
                </Text>
              ))}
            </View>
            <ChessBoard
              key={boardKey}
              chess={chess}
              playerColor={PLAYER_COLOR}
              onMove={handleMove}
              disabled={boardDisabled}
              lastMoveHighlight={lastMoveHighlight}
              upgradeHighlights={[...upgradeHighlights, ...bossHighlights, ...aiUpgradeHighlights]}
              spawnedSquare={spawnedSquare}
              forcedSquares={berserkForce?.forcedSquares}
              forcedMoves={activeForcedMoves}
              size={boardSize > 0 ? boardSize : undefined}
            />
          </View>
          <View style={styles.fileRow}>
            {FILE_LABELS.map(file => (
              <Text key={file} style={[styles.coordLabel, { width: cellSize }]}>
                {file}
              </Text>
            ))}
          </View>
        </View>
        <ChaosGoldToastStack items={goldToasts} onExpire={removeGoldToast} />
        {showKnightsOutBanner && (
          <View style={styles.knightsOutBanner} pointerEvents="none">
            <Text style={styles.knightsOutBannerText}>Кони закончились!</Text>
          </View>
        )}
      </View>

      <View onLayout={e => setBottomHeight(e.nativeEvent.layout.height)}>
        {(upgradePanelLines.length > 0 || aiUpgradePanelLines.length > 0 || evolutionCounterText || teleportCounterText) && (
          <View style={styles.upgradePanel} testID="chaos-upgrade-panel">
            <View style={styles.upgradeColumn}>
              <Text style={styles.upgradePanelHeader}>Мои фигуры</Text>
              {upgradePanelLines.map((line, i) => (
                <Text key={i} style={styles.upgradePanelLine} numberOfLines={1}>
                  {line.icon} {line.text}
                </Text>
              ))}
            </View>
            <View style={[styles.upgradeColumn, styles.upgradeColumnRight]} testID="chaos-enemy-upgrade-panel">
              <Text style={[styles.upgradePanelHeader, styles.textRight]}>Противник</Text>
              {aiUpgradePanelLines.map((line, i) => (
                <Text key={i} style={[styles.upgradePanelLine, styles.textRight]} numberOfLines={1}>
                  {line.icon} {line.text}
                </Text>
              ))}
              {evolutionCounterText && (
                <Text
                  style={[styles.evolutionCounter, evolutionCounterUrgent && styles.evolutionCounterUrgent, styles.textRight]}
                  numberOfLines={1}
                >
                  {evolutionCounterText}
                </Text>
              )}
              {teleportCounterText && (
                <Text
                  style={[styles.evolutionCounter, teleportCounterUrgent && styles.evolutionCounterUrgent, styles.textRight]}
                  numberOfLines={1}
                >
                  {teleportCounterText}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.goal}>{battleGoal}</Text>
        </View>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:        { flex: 1 },
  safe:            { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  titleBlock:      { flex: 1 },
  title:           { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  knightCounter:   { color: '#FF4444', fontSize: 12, fontWeight: '700', marginTop: 2 },
  exitBtn:         { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:     { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  goldBadge:       { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  thinking:        { fontSize: 20 },
  boardWrap:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boardOuter:      { flexDirection: 'column', alignSelf: 'center', paddingHorizontal: 20 },
  boardRow:        { flexDirection: 'row' },
  fileRow:         { flexDirection: 'row', marginLeft: COORD_COLUMN_WIDTH },
  rankColumn:      { width: COORD_COLUMN_WIDTH, justifyContent: 'space-around', alignItems: 'center' },
  coordLabel:      { fontSize: 9, color: '#a0a0c8', textAlign: 'center' },
  knightsOutBanner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: '#FF4444', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', zIndex: 50,
  },
  knightsOutBannerText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  upgradePanel:    { flexDirection: 'row', height: 92, paddingHorizontal: 16, paddingVertical: 6 },
  upgradeColumn:      { flex: 1, alignItems: 'flex-start' },
  upgradeColumnRight: { alignItems: 'flex-end' },
  upgradePanelHeader: { color: '#64748b', fontSize: 10, fontWeight: '700', marginBottom: 2 },
  upgradePanelLine:{ color: '#94a3b8', fontSize: 11, lineHeight: 15 },
  evolutionCounter:       { color: '#f1f5f9', fontSize: 10, lineHeight: 14, marginTop: 2 },
  evolutionCounterUrgent: { color: '#FFD700' },
  textRight:       { textAlign: 'right' },
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
