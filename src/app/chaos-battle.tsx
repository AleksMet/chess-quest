import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { ChessBoard } from '../components/chess/ChessBoard';
import { StockfishBridgeView } from '../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../components/engine/StockfishBridgeView';
import type { MoveResult } from '../engine/chessLogic';
import {
  buildChaosFen,
  CHAOS_BATTLE_ELO,
  CHAOS_MOVE_LIMIT,
  CHAOS_GOLD,
  CHAOS_FORK_BONUS,
  CHAOS_BLITZ_MOVE_LIMIT,
  type ChaosBattleNumber,
} from '../engine/chaosBattle';
import { calcCaptureScore } from '../engine/scoreEngine';
import { countMaterial } from '../engine/positionGenerator';
import { useChaosModeStore } from '../store/chaosModeStore';
import { eloToSkillLevel } from '../engine/stockfish';

const PLAYER_COLOR = 'w' as const;

const BATTLE_TITLES: Record<ChaosBattleNumber, string> = {
  1: '⚔️ Бой 1',
  2: '⚔️ Бой 2',
  3: '⚔️ Бой 3',
  boss: '👑 Финальный бой',
};

const BATTLE_GOALS: Record<ChaosBattleNumber, string> = {
  1: 'Поставь мат сопернику быстрее, чем за 20 ходов',
  2: 'Армия соперника усилена — действуй решительно',
  3: 'Последний бой перед боссом — собери всё золото',
  boss: 'Финальный бой без лимита ходов. Удачи!',
};

// На каком этаже башни проходит какой бой (currentFloor: 1 → бой 1, 3 → бой 2, 4 → бой 3, 6 → босс)
function battleNumberForFloor(floor: number): ChaosBattleNumber | null {
  switch (floor) {
    case 1: return 1;
    case 3: return 2;
    case 4: return 3;
    case 6: return 'boss';
    default: return null;
  }
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
  const { currentFloor, pieces, artifacts, addGold, addScore, nextFloor } = useChaosModeStore();

  const battleNumber = battleNumberForFloor(currentFloor);
  const safeBattleNumber: ChaosBattleNumber = battleNumber ?? 1;
  const opponentElo = CHAOS_BATTLE_ELO[safeBattleNumber];
  const skillLevel = eloToSkillLevel(opponentElo);
  const moveLimit = CHAOS_MOVE_LIMIT[safeBattleNumber];

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
  const goldRef = useRef(0);
  const finalGoldRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (battleNumber === null) { router.replace('/chaos-tower'); return null; }

  useEffect(() => () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  }, []);

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
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | undefined;
    try {
      const move = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }
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
  }, [chess, playerMoves]);

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
    }
    if (move.piece === 'n' && artifacts.includes('fork_master') && isKnightFork(chess, move.to as Square)) {
      goldRef.current += CHAOS_FORK_BONUS;
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
    if (moveLimit !== null && newCount >= moveLimit) {
      const white = countMaterial(chess, 'w');
      const black = countMaterial(chess, 'b');
      if (white > black) finishBattle('win', 'Лимит ходов — у тебя больше материала!', CHAOS_GOLD.materialWin, newCount);
      else if (black > white) finishBattle('lose', 'Лимит ходов — у соперника больше материала', 0, newCount);
      else finishBattle('draw', 'Лимит ходов — материал равен', 0, newCount);
      return;
    }

    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove, artifacts, moveLimit]);

  function handleContinue() {
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

  const movesLeft = moveLimit !== null ? moveLimit - playerMoves : null;
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
        {movesLeft !== null && (
          <View style={[styles.moveBadge, movesLeft <= 5 && styles.moveBadgeUrgent]}>
            <Text style={styles.moveCount}>{Math.max(0, movesLeft)}</Text>
            <Text style={styles.moveLabel}>ходов</Text>
          </View>
        )}
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
        />
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
  moveBadge:       { backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, alignItems: 'center', minWidth: 52 },
  moveBadgeUrgent: { backgroundColor: '#7f1d1d' },
  moveCount:       { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  moveLabel:       { color: '#94a3b8', fontSize: 10 },
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
