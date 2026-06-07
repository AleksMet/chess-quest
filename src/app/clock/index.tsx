import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import {
  CLOCK_ELO,
  CLOCK_TIME_LIMIT_SECONDS,
  CLOCK_MATE_BONUS,
  selectClockPosition,
  resolveClockTimeout,
} from '../../engine/clockMode';
import { calcCaptureScore } from '../../engine/scoreEngine';
import { useRunStore } from '../../store/runStore';
import { eloToSkillLevel } from '../../engine/stockfish';

const PLAYER_COLOR = 'w' as const;

// Цвет таймера меняется ТОЛЬКО через Animated: зелёный >30с, жёлтый 10-30с, красный <10с
const TIMER_COLOR_INPUT = [0, 9.999, 10, 29.999, 30, CLOCK_TIME_LIMIT_SECONDS];
const TIMER_COLOR_OUTPUT = ['#ef4444', '#ef4444', '#eab308', '#eab308', '#22c55e', '#22c55e'];

export default function ClockPage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, recordFloorScore, completeNode, setCurrentFen, isActive } = useRunStore();

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? CLOCK_ELO;
  const skillLevel = eloToSkillLevel(opponentElo);

  const [startFen] = useState(() => selectClockPosition());
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);

  const [secondsLeft, setSecondsLeft] = useState(CLOCK_TIME_LIMIT_SECONDS);
  const timeLeftRef = useRef(CLOCK_TIME_LIMIT_SECONDS);
  const timerAnim = useRef(new Animated.Value(CLOCK_TIME_LIMIT_SECONDS)).current;
  const timerColor = timerAnim.interpolate({ inputRange: TIMER_COLOR_INPUT, outputRange: TIMER_COLOR_OUTPUT });

  const [scoreDisplay, setScoreDisplay] = useState(0);
  const scoreRef = useRef(0);
  const playerCaptureRef = useRef(0);
  const aiCaptureRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<'win' | 'lose' | 'draw' | null>(null);
  resultRef.current = result;

  if (!isActive) { router.replace('/'); return null; }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    if (timerRef.current || timeLeftRef.current <= 0) return;
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      const next = timeLeftRef.current;
      // Побочные эффекты — ВНЕ функции обновления состояния (setState updater должен быть чистым)
      setSecondsLeft(next);
      timerAnim.setValue(Math.max(0, next));
      if (next <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  useEffect(() => () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    stopTimer();
  }, []);

  // Таймер идёт только когда сейчас ход игрока и партия не закончена;
  // на ходу AI и при завершении боя — останавливается (но не сбрасывается)
  useEffect(() => {
    const shouldRun = engineReady && !isAIThinking && result === null && chess.turn() === PLAYER_COLOR;
    if (shouldRun) startTimer();
    else stopTimer();
    return () => stopTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, isAIThinking, result, chess.turn()]);

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  function finishGame(r: 'win' | 'lose' | 'draw', reason: string, points: number) {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    stopTimer();
    scoreRef.current = points;
    setScoreDisplay(points);
    setResult(r);
    setResultReason(reason);
    setCurrentFen(chess.fen());
  }

  function handleTimeout() {
    if (resultRef.current !== null) return;
    const outcome = resolveClockTimeout(playerCaptureRef.current, aiCaptureRef.current);
    if (outcome === 'win') {
      finishGame('win', 'Время вышло — у тебя больше материала!', playerCaptureRef.current);
    } else {
      finishGame('draw', 'Время вышло — ничья, 0 очков', 0);
    }
  }

  const applyAIMove = useCallback((uci: string) => {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | undefined;
    try {
      const move = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }
      if (move.captured) aiCaptureRef.current += calcCaptureScore(move.captured);
      setOpponentLastMove({ from, to });
      setBoardKey(k => k + 1);
      setIsAIThinking(false);

      if (chess.isCheckmate()) { finishGame('lose', 'Мат!', 0); return; }
      if (chess.isDraw() || chess.isStalemate()) { finishGame('draw', 'Ничья — 0 очков', 0); return; }
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess]);

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
    setBoardKey(k => k + 1);

    const move = moveResult.move;
    if (move.captured) {
      playerCaptureRef.current += calcCaptureScore(move.captured);
      setScoreDisplay(playerCaptureRef.current);
    }

    if (moveResult.isCheckmate) {
      const total = playerCaptureRef.current + CLOCK_MATE_BONUS;
      finishGame('win', 'Мгновенный мат!', total);
      return;
    }
    if (moveResult.isDraw || moveResult.isStalemate) {
      finishGame('draw', 'Ничья — 0 очков', 0);
      return;
    }

    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, requestAIMove]);

  function handleContinue() {
    if (result === 'win' || result === 'draw') {
      recordFloorScore(currentNodeIndex, scoreRef.current);
      completeNode(currentNodeIndex);
      router.replace('/adventure');
    } else {
      router.replace('/adventure');
    }
  }

  function handleExit() {
    Alert.alert('Выйти из боя?', 'Прогресс потеряется.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => router.replace('/adventure') },
    ]);
  }

  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>⏱️ Часы</Text>
        <Pressable style={styles.exitBtn} onPress={handleExit}>
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <Text style={styles.scoreBadge}>⭐ {scoreDisplay}</Text>
      </View>

      <View style={styles.timerWrap}>
        <Animated.Text style={[styles.timerText, { color: timerColor }]}>{timeLabel}</Animated.Text>
        {/* Место под надпись зарезервировано всегда — opacity вместо conditional render, чтобы доска не прыгала */}
        <Text style={[styles.thinking, { opacity: isAIThinking ? 1 : 0 }]}>⏳ ход соперника</Text>
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
        <Text style={styles.goal}>
          ⏱️ На раздумья — {CLOCK_TIME_LIMIT_SECONDS} секунд суммарно. Мат = победа + {CLOCK_MATE_BONUS} очков
        </Text>
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
          {result !== 'lose' && <Text style={styles.resultScore}>+{scoreRef.current} ⭐</Text>}
          <Pressable style={styles.continueBtn} onPress={handleContinue}>
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
  scoreBadge:      { color: '#fbbf24', fontSize: 15, fontWeight: '700' },
  timerWrap:       { alignItems: 'center', paddingVertical: 6, gap: 4 },
  timerText:       { fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] },
  thinking:        { color: '#94a3b8', fontSize: 13 },
  boardWrap:       { flex: 1 },
  footer:          { paddingHorizontal: 16, paddingVertical: 8 },
  goal:            { color: '#64748b', fontSize: 12, textAlign: 'center' },
  overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resultEmoji:     { fontSize: 72 },
  resultTitle:     { color: '#fff', fontSize: 32, fontWeight: '900' },
  resultReason:    { color: '#94a3b8', fontSize: 16 },
  resultScore:     { color: '#ffd700', fontSize: 28, fontWeight: '800' },
  continueBtn:     { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
