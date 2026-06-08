import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
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
import { processPlayerMove } from '../engine/chaosUpgradeEngine';
import type { PieceUpgrade } from '../types/chaos';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import { useChaosModeStore } from '../store/chaosModeStore';
import { eloToSkillLevel } from '../engine/stockfish';

// Бонус золота за «ключевые» взятия — независимо от улучшений (попап в правом верхнем углу);
// пешки не учитываются (см. ЗАДАЧА 3 спецификации режима ХАОС)
const KEY_CAPTURE_PIECES: PieceSymbol[] = ['n', 'b', 'r', 'q'];

// Динамическая подсветка Стража: ход «на месте» 1→0.10 ... 4→0.40, 5-й ход → 0.60 (затем сброс)
const GUARD_HIGHLIGHT_OPACITY = [0.10, 0.10, 0.20, 0.30, 0.40, 0.60];
const GUARD_TRIGGER_TURNS = 5;

function upgradeBonusGold(upgradeType: PieceUpgrade['upgradeType']): number {
  return UPGRADE_DEFINITIONS.find(d => d.type === upgradeType)?.bonusGold ?? 0;
}

function upgradeName(upgradeType: PieceUpgrade['upgradeType']): string {
  return UPGRADE_DEFINITIONS.find(d => d.type === upgradeType)?.name ?? upgradeType;
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

// Состояние улучшённой фигуры в текущем бою — клетка и счётчик «ходов на месте» для Стража/Крепости.
// Хранится локально (не в сторе): счётчик обнуляется с началом каждого боя.
interface UpgradeRuntimeState {
  square: Square | null; // null — фигура взята
  turnsOnPosition: number;
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
  const { currentFloor, pieces, purchasedPieces, pieceUpgrades, artifacts, addGold, addScore, setPieces, savePurchasedPieces, nextFloor } = useChaosModeStore();

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
  const goldRef = useRef(0);
  const finalGoldRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const upgradeStateRef = useRef<Map<string, UpgradeRuntimeState>>(new Map());
  const goldToastIdRef = useRef(0);

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
    for (const upgrade of pieceUpgrades) {
      map.set(upgrade.id, {
        square: pieceStartingSquare(upgrade.pieceType, upgrade.pieceIndex),
        turnsOnPosition: 0,
      });
    }
    upgradeStateRef.current = map;
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
  }

  // Раз за ход игрока — продлеваем счётчик «на месте» живым улучшенным фигурам
  // (используется и Крепостью, и Стражем — обе награждают за стояние на месте)
  function tickUpgradeCounters() {
    for (const state of upgradeStateRef.current.values()) {
      if (state.square !== null) state.turnsOnPosition += 1;
    }
  }

  // Снимок улучшений с актуальными счётчиками — для передачи в processPlayerMove
  function liveUpgrades(): PieceUpgrade[] {
    return pieceUpgrades.map(u => {
      const state = upgradeStateRef.current.get(u.id);
      return state ? { ...u, turnsOnPosition: state.turnsOnPosition } : u;
    });
  }

  // Страж: на 5-й ход подряд на месте — золото и попап, затем сброс счётчика.
  // Считается отдельно от processPlayerMove, т.к. требует сброса состояния (побочный эффект).
  function checkGuardBonus() {
    const bonus = upgradeBonusGold('guard');
    for (const upgrade of pieceUpgrades) {
      if (upgrade.upgradeType !== 'guard') continue;
      const state = upgradeStateRef.current.get(upgrade.id);
      if (state && state.square !== null && state.turnsOnPosition >= GUARD_TRIGGER_TURNS) {
        goldRef.current += bonus;
        pushGoldToast(`+${bonus} золота — Страж`);
        state.turnsOnPosition = 0;
      }
    }
  }

  // Подсветка клеток улучшенных фигур игрока: атакующие (greedy/berserk/sniper) — красным,
  // Крепость — синим (фикс. прозрачность), Страж — синим с пульсацией по счётчику «на месте».
  // Пересчитывается на каждый ход (boardKey).
  const upgradeHighlights = pieceUpgrades.reduce<{ square: Square; color: 'red' | 'blue' | 'gold'; opacity: number }[]>((acc, upgrade) => {
    const state = upgradeStateRef.current.get(upgrade.id);
    if (!state?.square) return acc;
    if (upgrade.upgradeType === 'guard') {
      const step = Math.min(state.turnsOnPosition, GUARD_HIGHLIGHT_OPACITY.length - 1);
      acc.push({ square: state.square, color: 'blue', opacity: GUARD_HIGHLIGHT_OPACITY[step] });
    } else {
      acc.push({ square: state.square, color: upgrade.category === 'attack' ? 'red' : 'blue', opacity: 0.35 });
    }
    return acc;
  }, []);

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
      if (pieceUpgrades.length > 0) trackUpgradeMove(from, to);
      // Босс «Всадник»: каждый ход королём — новый конь на случайной клетке рядов 5-8,
      // появляется с плавным проявлением (анимация в ChessBoard через spawnedSquare)
      if (safeBattleNumber === 'boss') {
        const spawnSquare = spawnKnightOnKingMove(chess, move);
        if (spawnSquare) setSpawnedSquare(spawnSquare);
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
    }
    if (move.piece === 'n' && artifacts.includes('fork_master') && isKnightFork(chess, move.to as Square)) {
      goldRef.current += CHAOS_FORK_BONUS;
    }
    if (pieceUpgrades.length > 0) {
      trackUpgradeMove(move.from as Square, move.to as Square);
      tickUpgradeCounters();
      for (const trigger of processPlayerMove(move, liveUpgrades())) {
        goldRef.current += trigger.bonus;
        pushGoldToast(`+${trigger.bonus} золота — ${upgradeName(trigger.upgradeType)}`);
      }
      checkGuardBonus();
    }
    setGoldDisplay(goldRef.current);

    if (moveResult.isCheckmate) {
      const mateGold = newCount <= 10 ? CHAOS_GOLD.mateUnder10 : CHAOS_GOLD.mate11to20;
      finishBattle('win', 'Мат противнику!', mateGold, newCount);
      return;
    }
    if (moveResult.isDraw || moveResult.isStalemate) {
      finishBattle('draw', 'Ничья — золото не начисляется', 0, newCount);
      return;
    }

    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove, artifacts, pieceUpgrades]);

  function handleContinue() {
    // Превращённые во время боя ферзи возвращаются пешками — переходит только купленная армия
    setPieces(resolveArmyAfterBattle(chess.fen(), purchasedPieces));
    // addScore всегда вызывается ровно раз за бой (даже с 0), чтобы floorScores[i]
    // оставался выровнен по номеру боя для разбивки на экране победы
    if (finalGoldRef.current > 0) addGold(finalGoldRef.current);
    addScore(finalGoldRef.current);
    nextFloor();
    router.replace('/chaos-tower');
  }

  function handleExit() {
    Alert.alert('Выйти из боя?', 'Прогресс забега будет потерян.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { useChaosModeStore.getState().resetRun(); router.replace('/'); } },
    ]);
  }

  // Хуки уже объявлены — теперь можно безопасно делать условный return
  if (battleNumber === null) { router.replace('/chaos-tower'); return null; }

  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>{BATTLE_TITLES[safeBattleNumber]}</Text>
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
        />
        <ChaosGoldToastStack items={goldToasts} onExpire={removeGoldToast} />
      </View>

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
  title:           { flex: 1, color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  exitBtn:         { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:     { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  goldBadge:       { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  thinking:        { fontSize: 20 },
  boardWrap:       { flex: 1 },
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
