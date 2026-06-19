import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Move } from 'chess.js';
import { ChessBoard } from '../components/chess/ChessBoard';
import { StockfishBridgeView } from '../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../components/engine/StockfishBridgeView';
import { ChaosGoldToastStack } from '../components/ui/ChaosGoldToast';
import type { GoldToastItem } from '../components/ui/ChaosGoldToast';
import { UpgradeChipsRow, UpgradeDetailModal } from '../components/ui/ChaosUpgradeChips';
import type { EffectGroup, EffectGroupPiece } from '../components/ui/ChaosUpgradeChips';
import type { EffectCategory, PieceEffect } from '../types/pieceEffects';
import type { PieceKey } from '../components/chess/ChessPieceSVG';
import type { MoveResult } from '../engine/chessLogic';
import {
  buildChaosFen,
  buildLevel2AiFen,
  buildLevel2BossAiFen,
  resolveArmyAfterBattle,
  pieceStartingSquare,
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
import { PROGRESS_NODES, PROGRESS_NODES_ACT_1, getRandomModifier, MODIFIER_DESCRIPTIONS, ACT_CONFIGS } from '../data/chaosLevelConfigV3';
import type { BattleType, BattleModifier, AISpecialUpgradeConfig } from '../types/mechanics';
import { ProgressBar } from '../components/ProgressBar';
import { BattleBanner } from '../components/BattleBanner';
import { useChaosModeStore, pieceInstanceId } from '../store/chaosModeStore';
import { parsePieceId } from '../engine/chaosEventEngine';

// Бонус золота за «ключевые» взятия — независимо от улучшений (попап в правом верхнем углу);
// пешки не учитываются (см. ЗАДАЧА 3 спецификации режима ХАОС)
const KEY_CAPTURE_PIECES: PieceSymbol[] = ['n', 'b', 'r', 'q'];

// Страж награждает каждые 5 ходов выживания (см. guardSurvivalBonus в движке улучшений)
const GUARD_TRIGGER_TURNS = 5;

// Лимит призывов коней боссом «Всадник» (уровень 1)
const BOSS_KNIGHT_SPAWNS_LEVEL1 = 5;

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

const HOT_ZONE_CANDIDATES: Square[] = ['c6', 'd6', 'e6', 'f6', 'c7', 'd7', 'e7', 'f7'];

function pickHotZones(fen: string): Square[] {
  const tempChess = new Chess(fen);
  const available = HOT_ZONE_CANDIDATES.filter(sq => !tempChess.get(sq));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.random() > 0.5 ? 2 : 1);
}

function eloToSkillLevel(elo: number): number {
  if (elo <= 800)  return 5;
  if (elo <= 900)  return 7;
  if (elo <= 1000) return 9;
  if (elo <= 1100) return 11;
  if (elo <= 1200) return 13;
  if (elo <= 1300) return 15;
  if (elo <= 1400) return 17;
  if (elo <= 1500) return 18;
  if (elo <= 1600) return 19;
  return 20;
}

function getPressureElo(baseElo: number, moveCount: number): number {
  if (moveCount < 10) return baseElo;
  const increments = Math.floor((moveCount - 10) / 5) + 1;
  return baseElo + increments * 100;
}

const REINFORCEMENTS: Record<number, Record<number, PieceSymbol[]>> = {
  1: { 15: ['p'],       20: ['n'],       25: ['p', 'n'] },
  2: { 15: ['n'],       20: ['r'],       25: ['n', 'r'] },
  3: { 15: ['r'],       20: ['q'],       25: ['r', 'q'] },
};

const PIECE_NAMES_RU: Record<string, string> = {
  p: 'пешка', n: 'конь', r: 'ладья', q: 'ферзь', b: 'слон', k: 'король',
};

// Спавнит подкрепление противника на рядах 7-8; возвращает список заспавненных фигур
function spawnReinforcement(chess: Chess, act: number, moveNum: number): PieceSymbol[] {
  const pieces = REINFORCEMENTS[act]?.[moveNum];
  if (!pieces) return [];
  const SPAWN_ROWS = ['7', '8'];
  const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const spawned: PieceSymbol[] = [];
  pieces.forEach(piece => {
    const candidates: Square[] = [];
    SPAWN_ROWS.forEach(row => {
      COLS.forEach(col => {
        const sq = (col + row) as Square;
        if (!chess.get(sq)) candidates.push(sq);
      });
    });
    if (candidates.length === 0) return;
    const sq = candidates[Math.floor(Math.random() * candidates.length)];
    chess.put({ type: piece, color: 'b' }, sq);
    spawned.push(piece);
  });
  return spawned;
}


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

// Состав армии ИИ по этажу (уровень 1): 1 — слабый, 2 — усиленный, 'boss' — финальный.
// floor: shop(0)→бой1(1)→охота(2)→shop(3)→бой2(4)→элита(5)→shop(6)→boss(7)
function battleNumberForFloor(floor: number): ChaosBattleNumber | null {
  switch (floor) {
    case 1: return 1;
    case 2: return 2;
    case 4: return 2;
    case 5: return 2;
    case 7: return 'boss';
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
    cursedPieceId, clearCursedPiece, setPieceEffects,
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

  // Текущий узел конфига — для AI специальных улучшений (vortex, ricochet)
  const currentBattleNode = (() => {
    if (battleKey === 'elite') {
      return ACT_CONFIGS[currentLevel - 1]?.nodes.find(n => n.type === 'elite') ?? null;
    }
    if (typeof battleKey === 'number') {
      return ACT_CONFIGS[currentLevel - 1]?.nodes[battleKey] ?? null;
    }
    return null;
  })();

  const isValidFloor = currentLevel === 1 ? battleNumber !== null : battleKey !== null;

  const isBossBattle = currentLevel === 1 ? safeBattleNumber === 'boss' : battleKey === 'boss';
  // eslint-disable-next-line no-console
  console.log('[BOSS] isBossBattle:', isBossBattle, 'floor:', currentFloor);
  const opponentElo = (() => {
    if (isBossBattle) return CHAOS_BATTLE_ELO['boss'];
    if (currentLevel === 1) {
      if (typeof battleKey === 'number') return ACT_CONFIGS[0].nodes[battleKey]?.elo ?? CHAOS_BATTLE_ELO[safeBattleNumber];
      if (battleKey === 'elite') return ACT_CONFIGS[0].nodes[3]?.elo ?? 1300;
      return CHAOS_BATTLE_ELO[safeBattleNumber];
    }
    return battleConfig?.elo ?? 1000;
  })();
  // TODO: mechanics-v3 — стандартные улучшения AI убраны
  const aiUpgrades: AIUpgrade[] = [];

  // Тип боя V3: battleKey (= battleIndex узла башни) индексирует ACT_CONFIGS[level].nodes.
  // Это единственный источник истины — PROGRESS_NODES используется только для отображения.
  const v3BattleType: BattleType = (() => {
    if (isBossBattle) return 'elite';
    if (battleKey === 'elite') return 'elite';
    if (typeof battleKey === 'number') {
      const actConfig = ACT_CONFIGS[currentLevel - 1];
      return actConfig?.nodes[battleKey]?.type ?? 'standard';
    }
    return 'standard';
  })();

  // eslint-disable-next-line no-console
  console.log('[NAV] currentFloor:', currentFloor, 'battleType:', v3BattleType);

  const isQueenHunt   = v3BattleType === 'objective_queen_hunt';
  const isPawnMarch   = v3BattleType === 'objective_pawn_march';
  const isRoyalShield = v3BattleType === 'objective_royal_shield';

  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [battleModifier] = useState<BattleModifier | null>(() =>
    getRandomModifier(currentLevel, selectedCharacter?.id ?? 'merchant')
  );

  const [startFen] = useState(() => {
    if (currentLevel === 1) return buildChaosFen(pieces, safeBattleNumber);
    if (isBossBattle) return buildLevel2BossAiFen(pieces);
    return buildLevel2AiFen(pieces, aiUpgrades, isPawnMarch, isQueenHunt);
  });
  const [chess] = useState(() => new Chess(startFen));

  // Доска на всю ширину экрана, размер клетки — целое число пикселей
  const { width: screenWidth } = useWindowDimensions();
  const boardSize = Math.floor(screenWidth / 8) * 8;
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

  // Открытая модалка эффекта (нажатие на чип в HUD) — null, если модалка закрыта
  const [selectedUpgrade, setSelectedUpgrade] = useState<{ group: EffectGroup; isAI: boolean } | null>(null);

  const [goldDisplay, setGoldDisplay] = useState(0);
  const [spawnedSquare, setSpawnedSquare] = useState<Square | null>(null);
  const [goldToasts, setGoldToasts] = useState<GoldToastItem[]>([]);
  // Баннер «Кони закончились!» — показывается на 1с, когда счётчик призывов босса достигает 0
  const [showKnightsOutBanner, setShowKnightsOutBanner] = useState(false);
  // Механика сдачи: кнопка «Сдаться» появляется в HUD после того, как у игрока остался только король
  const [surrenderAvailable, setSurrenderAvailable] = useState(false);
  // Горячие зоны: 1-2 случайные клетки рядов 6-7, выбираются при старте боя
  const [hotZones] = useState<Square[]>(() => pickHotZones(startFen));
  // Баннер подкрепления противника — показывается 2с после спавна
  const [reinforcementText, setReinforcementText] = useState<string | null>(null);
  // Уведомление об усилении ELO — показывается 2с после хода AI
  const [eloBoostText, setEloBoostText] = useState<string | null>(null);
  // Alert про сдачу показывается только один раз за бой
  const surrenderAlertShown = useRef(false);
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
  // Счётчик ходов для системы нарастающего давления — зеркалит playerMoves без задержки ре-рендера
  const playerMovesRef = useRef(0);
  // Горячая зона: срабатывает только один раз за бой
  const hotZoneUsedRef = useRef(false);
  // AI специальные улучшения: Конь-Вихрь (vortex) и Слон-Рикошет (ricochet)
  const aiSpecialUpgradeConfigsRef = useRef<AISpecialUpgradeConfig[]>([]);
  // Objective — Охота на Ферзя: отслеживаем только ферзя ИИ
  const [aiQueenAlive, setAiQueenAlive] = useState(true);
  const aiQueenAliveRef = useRef(true);
  // Objective — Пешечный Марш: лучший ряд пешки и счётчик бонусов (макс 2)
  const [bestPawnRank, setBestPawnRank] = useState(2);
  const pawnMarchBonusCountRef = useRef(0);
  const pawnsAtRank6PlusRef = useRef(0);
  // Objective — Королевский Щит: количество шахов королю игрока за бой
  const [checkCount, setCheckCount] = useState(0);
  const checkCountRef = useRef(0);
  // Очередь попапов золота — показываем по одному с задержкой 400мс между ними
  const pendingToastsRef = useRef<string[]>([]);
  const toastActiveRef = useRef(false);

  const showNextPending = useCallback(() => {
    if (pendingToastsRef.current.length === 0) {
      toastActiveRef.current = false;
      return;
    }
    toastActiveRef.current = true;
    const text = pendingToastsRef.current.shift()!;
    const id = goldToastIdRef.current++;
    setGoldToasts([{ id, text }]);
  }, []);

  // Единый механизм попапов золота — по одному с задержкой 400мс между ними
  const pushGoldToast = useCallback((text: string) => {
    if (!toastActiveRef.current) {
      toastActiveRef.current = true;
      const id = goldToastIdRef.current++;
      setGoldToasts([{ id, text }]);
    } else {
      pendingToastsRef.current.push(text);
    }
  }, []);

  const removeGoldToast = useCallback((_id: number) => {
    setGoldToasts([]);
    setTimeout(showNextPending, 400);
  }, [showNextPending]);

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

  // Баннер подкрепления противника показываем 2 секунды, затем прячем
  useEffect(() => {
    if (!reinforcementText) return;
    const timer = setTimeout(() => setReinforcementText(null), 2000);
    return () => clearTimeout(timer);
  }, [reinforcementText]);

  // Уведомление об усилении ELO показываем 2 секунды, затем прячем
  useEffect(() => {
    if (!eloBoostText) return;
    const timer = setTimeout(() => setEloBoostText(null), 2000);
    return () => clearTimeout(timer);
  }, [eloBoostText]);

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

    // Универсальная система эффектов: мигрируем pieceUpgrades + проклятие в pieceEffects.
    // Работает параллельно с pieceUpgrades до полной миграции HUD на новую модель.
    const effects: PieceEffect[] = pieceUpgrades.map(upgrade => ({
      id: upgrade.id,
      pieceId: pieceInstanceId(upgrade.pieceType, upgrade.pieceIndex),
      pieceType: upgrade.pieceType,
      pieceColor: 'w',
      effectType: upgrade.upgradeType,
      category: upgrade.category as EffectCategory,
      label: upgradeName(upgrade.upgradeType),
      description: UPGRADE_DEFINITIONS.find(d => d.type === upgrade.upgradeType)?.description ?? '',
      isTemporary: false,
    }));
    if (cursedPieceId) {
      const { pieceType } = parsePieceId(cursedPieceId);
      effects.push({
        id: `curse_${cursedPieceId}`,
        pieceId: cursedPieceId,
        pieceType,
        pieceColor: 'w',
        effectType: 'curse',
        category: 'debuff',
        label: 'Проклятие',
        description: 'Фигура не может брать фигуры дороже пешки в этом бою',
        isTemporary: true,
        turnsRemaining: undefined,
      });
    }
    setPieceEffects(effects);

    // Инициализируем AI специальные улучшения для элитного боя
    const specialUpgradeTypes = currentBattleNode?.aiSpecialUpgrades ?? [];
    const specialConfigs: AISpecialUpgradeConfig[] = [];
    for (const upgradeType of specialUpgradeTypes) {
      if (upgradeType === 'vortex') {
        const squares = findAllPieceSquares(chess, 'n', 'b');
        if (squares.length > 0) {
          specialConfigs.push({ type: 'vortex', square: squares[0], piece: 'n', usedThisTurn: false });
        }
      } else if (upgradeType === 'ricochet') {
        const squares = findAllPieceSquares(chess, 'b', 'b');
        if (squares.length > 0) {
          specialConfigs.push({ type: 'ricochet', square: squares[0], piece: 'b', usedThisTurn: false });
        }
      }
    }
    aiSpecialUpgradeConfigsRef.current = specialConfigs;
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

  // Снимок улучшений с актуальными счётчиками и текущей клеткой — для передачи в processPlayerMove.
  // currentSquare позволяет processPlayerMove проверять конкретный экземпляр фигуры (не тип).
  function liveUpgrades(): PieceUpgrade[] {
    return pieceUpgrades.map(u => {
      const state = upgradeStateRef.current.get(u.id);
      return state
        ? { ...u, turnsOnPosition: state.turnsOnPosition, turnsAlive: state.turnsAlive, currentSquare: state.square }
        : u;
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

  // Горячие зоны: золотая подсветка случайных клеток рядов 6-7 — всегда видна
  const hotZoneHighlights = hotZones.map(square => ({
    square, color: 'gold' as const, opacity: 0.35,
  }));

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

  // Порядок категорий эффектов в HUD: атакующие (красные), затем защитные (синие), затем дебаффы (фиолетовые)
  const EFFECT_CATEGORY_ORDER: Record<EffectCategory, number> = { attack: 0, defense: 1, debuff: 2 };

  // Группировка по типу эффекта для HUD: одна иконка фигуры на тип эффекта,
  // счётчик — если фигур с этим эффектом больше одной (в т.ч. разных типов фигур).
  // Пересчитывается на каждый ход, учитывает только живые фигуры.
  function buildEffectGroups(
    entries: { pieceType: PieceSymbol; effectType: string; category: EffectCategory; label: string; description: string; count: number }[],
    sidePrefix: 'w' | 'b',
  ): EffectGroup[] {
    const map = new Map<string, { category: EffectCategory; label: string; description: string; pieces: Map<PieceSymbol, number> }>();
    for (const entry of entries) {
      let group = map.get(entry.effectType);
      if (!group) {
        group = { category: entry.category, label: entry.label, description: entry.description, pieces: new Map() };
        map.set(entry.effectType, group);
      }
      group.pieces.set(entry.pieceType, (group.pieces.get(entry.pieceType) ?? 0) + entry.count);
    }
    return [...map.entries()]
      .map(([effectType, group]) => {
        const pieces: EffectGroupPiece[] = [...group.pieces.entries()].map(([pieceType, count]) => ({ pieceType, count }));
        const totalCount = pieces.reduce((sum, p) => sum + p.count, 0);
        const iconPieceKey = `${sidePrefix}${pieces[0].pieceType.toUpperCase()}` as PieceKey;
        return { effectType, category: group.category, iconPieceKey, totalCount, pieces, label: group.label, description: group.description };
      })
      .sort((a, b) => EFFECT_CATEGORY_ORDER[a.category] - EFFECT_CATEGORY_ORDER[b.category]);
  }

  // HUD «Мои»: эффекты живых фигур игрока (улучшения + проклятие), сгруппированные по типу эффекта
  const playerEffectGroups = buildEffectGroups(
    [
      ...pieceUpgrades
        .filter(upgrade => upgradeStateRef.current.get(upgrade.id)?.square)
        .map(upgrade => ({
          pieceType: upgrade.pieceType,
          effectType: upgrade.upgradeType,
          category: upgrade.category as EffectCategory,
          label: upgradeName(upgrade.upgradeType),
          description: UPGRADE_DEFINITIONS.find(d => d.type === upgrade.upgradeType)?.description ?? '',
          count: 1,
        })),
      ...(cursedSquare ? [{
        pieceType: chess.get(cursedSquare)?.type ?? ('p' as PieceSymbol),
        effectType: 'curse',
        category: 'debuff' as EffectCategory,
        label: 'Проклятие',
        description: 'Фигура не может брать фигуры дороже пешки в этом бою',
        count: 1,
      }] : []),
    ],
    'w',
  );

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

  // Подсветка ключевых фигур босса «Всадник»: король-спавнер коней — золотым.
  // Ферзь-берсерк подсвечивается общей системой aiUpgradeHighlights (см. displayAiUpgrades).
  // Защитные улучшения боссу не нужны (ладья-страж не подсвечивается). Видна с первого хода игрока.
  const bossHighlights: typeof upgradeHighlights = [];

  // AI спец. улучшения: золотая подсветка клеток Коня-Вихря и Слона-Рикошета
  const aiSpecialUpgradeHighlights = aiSpecialUpgradeConfigsRef.current.map(config => ({
    square: config.square as Square,
    color: 'gold' as const,
    opacity: 0.5,
  }));

  // Уровень 2+: симметрия — улучшения ИИ подсвечиваются так же, как у игрока:
  // Берсерк/Снайпер — красным (#FF4444), Страж — синим (#4444FF), opacity 0.35.
  const currentAiUpgrades: AIUpgrade[] = currentLevel === 1 ? [] : aiUpgrades;

  // TODO: mechanics-v3 — AI-эффекты в HUD убраны вместе со стандартными улучшениями AI
  const displayAiUpgrades: AIUpgrade[] = currentAiUpgrades;

  const aiUpgradeHighlights: typeof upgradeHighlights = (() => {
    if (displayAiUpgrades.length === 0) return [];
    const map = new Map<Square, { square: Square; color: 'red' | 'blue' | 'gold' | 'purple'; opacity: number }>();
    for (const upgrade of displayAiUpgrades) {
      const color = upgrade.upgradeType === 'guard' ? 'blue' : 'red';
      for (const square of findAllPieceSquares(chess, upgrade.pieceType, 'b')) {
        map.set(square, { square, color, opacity: 0.35 });
      }
    }
    return [...map.values()];
  })();

  // HUD «AI»: эффекты живых фигур противника, сгруппированные по типу эффекта —
  // дубликаты типа+улучшения (например, 2x конь-Берсерк у Двуглавого Рыцаря) суммируются в один счётчик.
  const aiEffectGroups = buildEffectGroups(
    displayAiUpgrades
      .map(upgrade => {
        const definition = UPGRADE_DEFINITIONS.find(d => d.type === upgrade.upgradeType);
        return {
          pieceType: upgrade.pieceType,
          effectType: upgrade.upgradeType,
          category: (definition?.category ?? 'attack') as EffectCategory,
          label: definition?.name ?? upgrade.upgradeType,
          description: definition?.description ?? '',
          count: findAllPieceSquares(chess, upgrade.pieceType, 'b').length,
        };
      })
      .filter(entry => entry.count > 0),
    'b',
  );

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
    const initSkill = eloToSkillLevel(opponentElo);
    // eslint-disable-next-line no-console
    console.log('[ELO] init Stockfish skillLevel:', initSkill, 'baseElo:', opponentElo);
    sendToEngine(`setoption name Skill Level value ${initSkill}`);
  }, [opponentElo, sendToEngine]);

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

  // Механика сдачи: если у игрока на доске остался только король — предлагаем сдаться
  // (один раз за бой). При отказе остаётся доступна кнопка «Сдаться» в HUD.
  function checkSurrenderCondition() {
    if (surrenderAlertShown.current) return;
    const playerPieces = chess.board().flat().filter(p => p && p.color === PLAYER_COLOR);
    const onlyKingLeft = playerPieces.length === 1 && playerPieces[0]?.type === 'k';
    if (!onlyKingLeft) return;

    surrenderAlertShown.current = true;
    Alert.alert(
      '👑 Остался только король',
      'Твоя армия разгромлена. Продолжать бой бессмысленно. Сдаться?',
      [
        {
          text: 'Продолжить бой',
          style: 'cancel',
          onPress: () => setSurrenderAvailable(true),
        },
        {
          text: 'Сдаться',
          style: 'destructive',
          onPress: () => handleSurrender(),
        },
      ]
    );
  }

  // Сдача — поражение без награды; останавливаем ИИ и переводим бой в обычный экран поражения
  function handleSurrender() {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    sendToEngine('stop');
    setIsAIThinking(false);
    finishBattle('lose', 'Ты сдался', 0, playerMoves);
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

      // Обновление стейта откладывается на следующий кадр — не блокирует немедленную
      // отрисовку перемещённой фигуры ИИ доской
      requestAnimationFrame(() => {
        if (pieceUpgrades.length > 0) {
          trackUpgradeMove(from, to);
          // Провокатор: после хода ИИ проверяем, не оказалась ли фигура под атакой чёрных
          checkProvocateurBonus();
          setGoldDisplay(goldRef.current);
        }
        // Королевский Щит: шах королю игрока после хода ИИ
        if (isRoyalShield && chess.inCheck()) {
          const nc = checkCountRef.current + 1;
          checkCountRef.current = nc;
          setCheckCount(nc);
          pushGoldToast(`⚠️ Шах! (${nc}/2)`);
          if (nc === 3) pushGoldToast('💀 Щит пробит!');
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

        // AI спец. улучшение: обновляем позицию фигуры с улучшением (переместилась)
        for (const config of aiSpecialUpgradeConfigsRef.current) {
          if (config.square === from) {
            config.square = to;
            break;
          }
        }
        // AI спец. улучшение: дополнительный ход после взятия (вихрь / рикошет)
        if (move.captured) {
          const specialConfig = aiSpecialUpgradeConfigsRef.current.find(
            c => c.square === to && !c.usedThisTurn
          );
          if (specialConfig) {
            const pieceOnBoard = chess.get(to as Square);
            if (pieceOnBoard && pieceOnBoard.color === 'b' && pieceOnBoard.type === specialConfig.piece) {
              specialConfig.usedThisTurn = true;
              const extraLegal = chess.moves({ square: to as Square, verbose: true });
              if (extraLegal.length > 0) {
                const extraMove = extraLegal[Math.floor(Math.random() * extraLegal.length)];
                const extraChessMove = chess.move({ from: extraMove.from, to: extraMove.to });
                if (extraChessMove) {
                  if (pieceUpgrades.length > 0) {
                    trackUpgradeMove(extraMove.from as Square, extraMove.to as Square);
                  }
                  specialConfig.square = extraMove.to;
                  pushGoldToast(specialConfig.type === 'vortex' ? '⚡ Конь-Вихрь!' : '⚡ Слон-Рикошет!');
                  setLastMoveHighlight({ from: extraMove.from as Square, to: extraMove.to as Square, color: 'opponent' });
                }
              }
            }
          }
        }

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

        setIsAIThinking(false);
        checkSurrenderCondition();

        // Уведомление об усилении ELO — не для Королевского Щита (там давление не растёт)
        const currentMoveNum = playerMovesRef.current;
        if (!isRoyalShield && (currentMoveNum === 10 || currentMoveNum === 15 || currentMoveNum === 20)) {
          const totalIncrease = getPressureElo(opponentElo, currentMoveNum) - opponentElo;
          const eloMsg =
            currentMoveNum <= 15 ? `⚡ Противник усилился! ELO +${totalIncrease}` :
            `🔥 Противник опасен! ELO +${totalIncrease}`;
          setEloBoostText(eloMsg);
        }

        // Подкрепление противника на ходах 15/20/25 — не для Королевского Щита
        if (!isRoyalShield && (currentMoveNum === 15 || currentMoveNum === 20 || currentMoveNum === 25)) {
          const spawned = spawnReinforcement(chess, currentLevel, currentMoveNum);
          if (spawned.length > 0) {
            const names = spawned.map(p => PIECE_NAMES_RU[p] ?? p).join(' и ');
            setReinforcementText(`⚠️ Подкрепление врага! +${names}`);
          }
        }

        if (chess.isCheckmate()) {
          finishBattle('lose', 'Мат!', 0, playerMoves);
          return;
        }
        if (chess.isDraw() || chess.isStalemate()) {
          finishBattle('draw', 'Ничья — золото не начисляется', 0, playerMoves);
        }
      });
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, playerMoves, pieceUpgrades, currentLevel, currentAiUpgrades, isBossBattle, levelConfig, safeBattleNumber, bossKnightSpawnsLeft, pushGoldToast]);

  const requestAIMove = useCallback(() => {
    if (chess.isGameOver() || chess.turn() === PLAYER_COLOR) return;
    setIsAIThinking(true);
    // Сбрасываем флаг «использован в этом ходу» для AI специальных улучшений
    for (const config of aiSpecialUpgradeConfigsRef.current) {
      config.usedThisTurn = false;
    }
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
    // Перед каждым ходом AI актуализируем Skill Level — для Royal Shield давление не растёт
    const pressureElo = isRoyalShield ? opponentElo : getPressureElo(opponentElo, playerMovesRef.current);
    const skillLevel = eloToSkillLevel(pressureElo);
    // eslint-disable-next-line no-console
    console.log('[ELO] pressureElo:', pressureElo, 'skillLevel:', skillLevel);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
    const moveTime = playerMovesRef.current >= 15 ? 600 : 400;
    sendToEngine(`go movetime ${moveTime}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Обновление стейта и связанные с ним вычисления откладываются на следующий кадр —
    // не блокируют немедленную отрисовку перемещённой фигуры доской
    requestAnimationFrame(() => {
      setLastMoveHighlight(null);
      const newCount = playerMoves + 1;
      playerMovesRef.current = newCount;
      setPlayerMoves(newCount);

      const move = moveResult.move!;
      setLastMoveHighlight({ from: move.from as Square, to: move.to as Square, color: 'player' });
      if (move.captured) {
        // Игрок взял AI фигуру с спец. улучшением — удаляем её из списка
        aiSpecialUpgradeConfigsRef.current = aiSpecialUpgradeConfigsRef.current.filter(
          c => c.square !== move.to
        );
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
        // Усиленные пешки: +5 золота за каждую взятую пешку врага
        if (move.captured === 'p' && battleModifier === 'reinforced_pawns') {
          goldRef.current += 5;
          pushGoldToast('+5🪙 Усиленные пешки');
        }
        // Охота на Ферзя: игрок взял ферзя ИИ
        if (isQueenHunt && move.captured === 'q') {
          aiQueenAliveRef.current = false;
          setAiQueenAlive(false);
        }
      }
      // Пешечный Марш: обновляем лучший ряд и проверяем достижение ряда 6
      if (isPawnMarch) {
        const whitePawns = chess.board().flat().filter(p => p && p.color === 'w' && p.type === 'p');
        const maxRank = whitePawns.length > 0
          ? Math.max(...whitePawns.map(p => parseInt(p!.square[1], 10)))
          : 2;
        setBestPawnRank(maxRank);
        const atRank6 = whitePawns.filter(p => parseInt(p!.square[1], 10) >= 6).length;
        if (atRank6 > pawnsAtRank6PlusRef.current && pawnMarchBonusCountRef.current < 2) {
          goldRef.current += 40;
          pushGoldToast('🏰 +40🪙 Пешечный марш!');
          pawnMarchBonusCountRef.current += 1;
        }
        pawnsAtRank6PlusRef.current = atRank6;
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
      // Горячая зона: +15 золота один раз за бой — при первом заходе на случайную горячую клетку
      if (hotZones.includes(move.to as Square) && move.color === 'w' && !hotZoneUsedRef.current) {
        hotZoneUsedRef.current = true;
        goldRef.current += 15;
        pushGoldToast('+15🪙 Горячая зона');
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

      checkSurrenderCondition();

      if (moveResult.isCheckmate) {
        const mateGold = newCount <= 10 ? CHAOS_GOLD.mateUnder10 : CHAOS_GOLD.mate11to20;
        // Армия цела: если ≥8 фигур игрока выжили — бонус +25 золота
        const survivingCount = chess.board().flat().filter(p => p && p.color === PLAYER_COLOR).length;
        if (survivingCount >= 8) {
          goldRef.current += 25;
          pushGoldToast('+25🪙 Армия цела');
        }
        // Objective: Охота на Ферзя — бонус только за уничтожение ферзя ИИ
        if (isQueenHunt && !aiQueenAliveRef.current) {
          goldRef.current += 50;
          pushGoldToast('🎯 +50🪙 Ферзь повержен!');
        }
        // Objective: Королевский Щит
        if (isRoyalShield) {
          if (checkCountRef.current <= 2) {
            goldRef.current += 60;
            pushGoldToast('🛡️ +60🪙 Король защищён!');
          } else {
            pushGoldToast('🛡️ Бонус потерян');
          }
        }
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
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove, artifacts, pieceUpgrades, selectedCharacter, v3BattleType, hotZones, battleModifier, sendToEngine]);

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
    // Элита — бонусный магазин напрямую, минуя башню (иначе кнопка «Вперёд» показывает
    // следующий бой, а не магазин, что сбивает игрока)
    if (battleKey === 'elite') {
      router.replace('/chaos-shop');
      return;
    }
    router.replace('/chaos-tower');
  }

  // Кнопка-стрелка в левом верхнем углу — возврат на предыдущий экран без сброса забега
  function handleBack() {
    Alert.alert('Выйти из боя?', undefined, [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  // Хуки уже объявлены — теперь можно безопасно делать условный return
  if (!isValidFloor) { router.replace('/chaos-tower'); return null; }

  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR || isBannerVisible;

  // Заголовок и цель боя: уровень 1 — фиксированные тексты по номеру боя;
  // уровень 2+ — по узлу башни (имя босса, «Элита» или название узла обычного боя)
  const battleTitle = currentLevel === 1
    ? BATTLE_TITLES[safeBattleNumber]
    : isBossBattle
      ? `👑 Финальный бой — ${levelConfig.bossConfig.name}`
      : battleKey === 'elite'
        ? '💀 Элита'
        : `⚔️ ${node?.label ?? 'Бой'}`;

  const baseGoal = currentLevel === 1
    ? BATTLE_GOALS[safeBattleNumber]
    : isBossBattle
      ? 'Финальный бой. Удачи!'
      : battleKey === 'elite'
        ? 'Сложный противник с эффектами — действуй решительно'
        : 'Поставь мат сопернику';
  const battleGoal = battleModifier ? MODIFIER_DESCRIPTIONS[battleModifier] : baseGoal;

  return (
    <LinearGradient colors={['#0d0b14', '#1a1423', '#0d0b14']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.gradient}>
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <LinearGradient
        colors={['rgba(8,6,16,0.98)', 'rgba(14,11,22,0.92)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.hudTop}
      >
        <View style={styles.hudRow1}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} testID="chaos-battle-back-btn">
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.levelName} numberOfLines={1}>{battleTitle}</Text>
          <View style={[styles.eloBadge, playerMoves >= 15 ? styles.eloBadgeDanger : playerMoves >= 10 ? styles.eloBadgeWarning : undefined]}>
            <Text style={[styles.eloText, playerMoves >= 15 ? styles.eloTextDanger : playerMoves >= 10 ? styles.eloTextWarning : undefined]}>
              ELO {isRoyalShield ? opponentElo : getPressureElo(opponentElo, playerMoves)}
            </Text>
          </View>
          <Text style={[
            styles.moveCounter,
            playerMoves >= 15 ? styles.moveCounterDanger
            : playerMoves >= 10 ? styles.moveCounterWarning
            : styles.moveCounterNormal,
          ]}>Ход: {playerMoves}</Text>
          {!isRoyalShield && playerMoves >= 10 && playerMoves < 25 && (
            <Text style={[
              styles.reinforceCounter,
              playerMoves >= 13 ? styles.reinforceCounterDanger : styles.reinforceCounterWarning,
            ]}>
              {`⚠️ Подкр. через: ${playerMoves < 15 ? 15 - playerMoves : playerMoves < 20 ? 20 - playerMoves : 25 - playerMoves}`}
            </Text>
          )}
          <Text style={[styles.thinking, { opacity: isAIThinking ? 1 : 0 }]}>⏳</Text>
        </View>

        {currentLevel === 1 && isBossBattle && (
          <Text style={styles.knightCounter}>{knightSpawnCounterText(bossKnightSpawnsLeft)}</Text>
        )}

        {currentBattleNode?.aiSpecialUpgrades && currentBattleNode.aiSpecialUpgrades.length > 0 && (
          <Text style={styles.aiSpecialUpgradeHud}>
            {currentBattleNode.aiSpecialUpgrades.map(t => t === 'vortex' ? '⚡ Вихрь' : '⚡ Рикошет').join(' | ')}
          </Text>
        )}

        {(aiEffectGroups.length > 0 || evolutionCounterText || teleportCounterText) && (
          <UpgradeChipsRow
            label="Эффекты:"
            groups={aiEffectGroups}
            onPressGroup={group => setSelectedUpgrade({ group, isAI: true })}
            testID="chaos-ai-upgrade-row"
            extra={(evolutionCounterText || teleportCounterText) && (
              <View style={styles.counterTexts}>
                {evolutionCounterText && (
                  <Text style={[styles.evolutionCounter, evolutionCounterUrgent && styles.evolutionCounterUrgent]} numberOfLines={1}>
                    {evolutionCounterText}
                  </Text>
                )}
                {teleportCounterText && (
                  <Text style={[styles.evolutionCounter, teleportCounterUrgent && styles.evolutionCounterUrgent]} numberOfLines={1}>
                    {teleportCounterText}
                  </Text>
                )}
              </View>
            )}
          />
        )}
      </LinearGradient>

      <ProgressBar
        nodes={PROGRESS_NODES[currentLevel] ?? PROGRESS_NODES_ACT_1}
        currentIndex={currentFloor - 1}
      />

      {(isQueenHunt || isPawnMarch || isRoyalShield) && (
        <View style={styles.objectiveStrip}>
          {isQueenHunt && (
            <Text style={styles.objectiveStripText}>
              {`🎯 Ферзь врага: ${aiQueenAlive ? '✓' : '✗'}`}
            </Text>
          )}
          {isPawnMarch && (
            <Text style={styles.objectiveStripText}>
              {`🏰 Лучшая пешка: ряд ${bestPawnRank} → цель: ряд 6`}
            </Text>
          )}
          {isRoyalShield && (
            <Text style={[
              styles.objectiveStripText,
              checkCount >= 2 ? styles.objectiveStripDanger
                : checkCount >= 1 ? styles.objectiveStripWarning
                : styles.objectiveStripOk,
            ]}>
              {`🛡️ Шахов: ${checkCount} / 2`}
            </Text>
          )}
        </View>
      )}

      <View style={styles.boardWrap}>
        <View style={styles.boardFrameOuter}>
          <View style={styles.frameBar} />

          <ChessBoard
            chess={chess}
            playerColor={PLAYER_COLOR}
            onMove={handleMove}
            disabled={boardDisabled}
            lastMoveHighlight={lastMoveHighlight}
            upgradeHighlights={[...upgradeHighlights, ...bossHighlights, ...aiUpgradeHighlights, ...hotZoneHighlights, ...aiSpecialUpgradeHighlights]}
            spawnedSquare={spawnedSquare}
            forcedSquares={berserkForce?.forcedSquares}
            forcedMoves={activeForcedMoves}
            size={boardSize > 0 ? boardSize : undefined}
            showCoordinates
          />

          <View style={styles.frameBar} />
        </View>
        <ChaosGoldToastStack items={goldToasts} onExpire={removeGoldToast} />
        {showKnightsOutBanner && (
          <View style={styles.knightsOutBanner} pointerEvents="none">
            <Text style={styles.knightsOutBannerText}>Кони закончились!</Text>
          </View>
        )}
        {reinforcementText && (
          <View style={styles.reinforcementBanner} pointerEvents="none">
            <Text style={styles.reinforcementBannerText}>{reinforcementText}</Text>
          </View>
        )}
        {eloBoostText && (
          <View style={styles.eloBoostBanner} pointerEvents="none">
            <Text style={styles.eloBoostBannerText}>{eloBoostText}</Text>
          </View>
        )}
      </View>

      <LinearGradient
        colors={['rgba(14,11,22,0.92)', 'rgba(8,6,16,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.hudBot}
      >
        <View style={styles.hudRow1}>
          <Text style={styles.heroName} numberOfLines={1}>⚔️ {selectedCharacter?.name ?? 'Герой'}</Text>
          <View style={styles.goldDisplay}>
            <View style={styles.goldCoin}>
              <Text style={styles.goldCoinText}>₵</Text>
            </View>
            <Text style={styles.goldVal}>{goldDisplay}</Text>
          </View>
        </View>

        <UpgradeChipsRow
          label="Эффекты:"
          groups={playerEffectGroups}
          onPressGroup={group => setSelectedUpgrade({ group, isAI: false })}
          testID="chaos-player-upgrade-row"
        />

        <View style={styles.footer}>
          <Text style={[styles.goal, battleModifier ? styles.goalModifier : styles.goalDefault]}>{battleGoal}</Text>
          {surrenderAvailable && (
            <TouchableOpacity onPress={handleSurrender} style={styles.surrenderBtn} testID="chaos-battle-surrender-btn">
              <Text style={styles.surrenderBtnText}>🏳️ Сдаться</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <UpgradeDetailModal
        group={selectedUpgrade?.group ?? null}
        isAI={selectedUpgrade?.isAI ?? false}
        onClose={() => setSelectedUpgrade(null)}
      />

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

      {isBannerVisible && !result && (
        <BattleBanner
          battleType={v3BattleType}
          modifier={battleModifier}
          elo={opponentElo}
          aiSpecialUpgrades={currentBattleNode?.aiSpecialUpgrades}
          onClose={() => setIsBannerVisible(false)}
        />
      )}
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:        { flex: 1 },
  safe:            { flex: 1 },

  hudTop: {
    paddingHorizontal: 12, paddingVertical: 7, gap: 5,
    borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.2)',
  },
  hudBot: {
    paddingHorizontal: 12, paddingVertical: 7, gap: 5,
    borderTopWidth: 1, borderTopColor: 'rgba(234,179,8,0.2)',
  },
  hudRow1:         { flexDirection: 'row', alignItems: 'center', gap: 7 },

  backBtn: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText:     { fontSize: 16, color: '#a855f7' },

  levelName:       { fontSize: 15, color: '#e5e5e5', fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  eloBadge: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  eloBadgeWarning: { backgroundColor: 'rgba(234,179,8,0.12)', borderColor: 'rgba(234,179,8,0.3)' },
  eloBadgeDanger:  { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' },
  eloText:         { fontSize: 11, color: '#a855f7' },
  eloTextWarning:  { color: '#eab308' },
  eloTextDanger:   { color: '#ef4444' },

  heroName:        { fontSize: 13, color: '#eab308', fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  goldDisplay:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goldCoin: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#eab308',
    alignItems: 'center', justifyContent: 'center',
  },
  goldCoinText:    { fontSize: 11, fontWeight: '900', color: '#5a3000' },
  goldVal:         { fontSize: 13, color: '#eab308', fontWeight: '700', fontFamily: 'monospace' },

  knightCounter:        { color: '#FF4444', fontSize: 12, fontWeight: '700' },
  aiSpecialUpgradeHud:  { color: '#eab308', fontSize: 10, fontWeight: '700' },
  thinking:        { fontSize: 16 },
  boardWrap:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boardFrameOuter: { width: '100%' },
  frameBar:        { width: '100%', height: 7, backgroundColor: '#7a4520' },
  knightsOutBanner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: '#FF4444', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', zIndex: 50,
  },
  knightsOutBannerText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  counterTexts:    { alignItems: 'flex-end' },
  evolutionCounter:       { color: '#f1f5f9', fontSize: 10, lineHeight: 14, marginTop: 2 },
  evolutionCounterUrgent: { color: '#FFD700' },
  footer:          { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', gap: 8 },
  goal:            { textAlign: 'center' },
  goalDefault:     { color: 'rgba(160,160,200,0.6)', fontSize: 12 },
  goalModifier:    { color: '#a855f7', fontSize: 11 },
  surrenderBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#ef4444',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  surrenderBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resultEmoji:     { fontSize: 72 },
  resultTitle:     { color: '#fff', fontSize: 32, fontWeight: '900' },
  resultReason:    { color: '#94a3b8', fontSize: 16 },
  resultGold:      { color: '#f59e0b', fontSize: 28, fontWeight: '800' },
  continueBtn:     { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  moveCounter:      { fontSize: 10 },
  moveCounterNormal:  { color: '#7a6a90' },
  moveCounterWarning: { color: '#eab308' },
  moveCounterDanger:  { color: '#ef4444' },

  reinforceCounter:        { fontSize: 9 },
  reinforceCounterWarning: { color: '#eab308' },
  reinforceCounterDanger:  { color: '#ef4444' },

  reinforcementBanner: {
    position: 'absolute', top: 100, left: 16, right: 16,
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 8, paddingVertical: 8, alignItems: 'center', zIndex: 50,
  },
  reinforcementBannerText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  eloBoostBanner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 8, paddingVertical: 8, alignItems: 'center', zIndex: 50,
  },
  eloBoostBannerText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  objectiveStrip: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234,179,8,0.15)',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectiveStripText: { fontSize: 10, color: '#a0a0c8', textAlign: 'center' },
  objectiveStripOk:      { color: '#4ade80' },
  objectiveStripWarning: { color: '#eab308' },
  objectiveStripDanger:  { color: '#ef4444' },
});
