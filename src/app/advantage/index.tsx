import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import {
  ADVANTAGE_ELO,
  ADVANTAGE_MOVE_LIMIT,
  ADVANTAGE_EXTRA_QUEEN_SQUARE,
  ADVANTAGE_EXTRA_QUEEN_BONUS,
  generateAdvantageFen,
  resolveAdvantageByMaterial,
} from '../../engine/advantageMode';
import { calcMateScore, calcCaptureScore } from '../../engine/scoreEngine';
import { useRunStore } from '../../store/runStore';
import { eloToSkillLevel } from '../../engine/stockfish';

const PLAYER_COLOR = 'w' as const;
const INTRO_DURATION_MS = 3000;

export default function AdvantagePage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, recordFloorScore, completeNode, setCurrentFen, isActive } = useRunStore();

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? ADVANTAGE_ELO;
  const skillLevel = eloToSkillLevel(opponentElo);

  const [startFen] = useState(() => generateAdvantageFen());
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const [scoreDisplay, setScoreDisplay] = useState(0);
  const scoreRef = useRef(0);
  const queenBonusClaimedRef = useRef(false);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isActive) { router.replace('/'); return null; }

  // Самозакрывающийся оверлей с предупреждением — 3 секунды, затем бой начинается
  useEffect(() => {
    introTimerRef.current = setTimeout(() => setShowIntro(false), INTRO_DURATION_MS);
    return () => { if (introTimerRef.current) clearTimeout(introTimerRef.current); };
  }, []);

  useEffect(() => () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
  }, []);

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  function finishGame(r: 'win' | 'lose' | 'draw', reason: string, points: number) {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    scoreRef.current = points;
    setScoreDisplay(points);
    setResult(r);
    setResultReason(reason);
    setCurrentFen(chess.fen());
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

      if (chess.isCheckmate()) { finishGame('lose', 'Мат!', 0); return; }
      if (chess.isDraw() || chess.isStalemate()) { finishGame('draw', 'Ничья', scoreRef.current); return; }
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
    if (engineReady && !showIntro && chess.turn() !== PLAYER_COLOR) requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, showIntro]);

  const handleMove = useCallback((moveResult: MoveResult) => {
    if (!moveResult.success || !moveResult.move) return;
    setOpponentLastMove(null);
    const newCount = playerMoves + 1;
    setPlayerMoves(newCount);
    setBoardKey(k => k + 1);

    const move = moveResult.move;
    if (move.captured) {
      let gained = calcCaptureScore(move.captured);
      if (
        !queenBonusClaimedRef.current &&
        move.to === ADVANTAGE_EXTRA_QUEEN_SQUARE &&
        move.captured === 'q'
      ) {
        queenBonusClaimedRef.current = true;
        gained += ADVANTAGE_EXTRA_QUEEN_BONUS;
      }
      scoreRef.current += gained;
      setScoreDisplay(scoreRef.current);
    }

    if (moveResult.isCheckmate) {
      finishGame('win', 'Мат противнику!', scoreRef.current + calcMateScore(newCount, ADVANTAGE_MOVE_LIMIT));
      return;
    }
    if (moveResult.isDraw || moveResult.isStalemate) {
      finishGame('draw', 'Ничья', scoreRef.current);
      return;
    }
    if (newCount >= ADVANTAGE_MOVE_LIMIT) {
      const outcome = resolveAdvantageByMaterial(chess);
      if (outcome === 'win') finishGame('win', 'Лимит ходов — у тебя больше материала!', scoreRef.current);
      else if (outcome === 'lose') finishGame('lose', 'Лимит ходов — у соперника больше материала', 0);
      else finishGame('draw', 'Лимит ходов — материал равен', scoreRef.current);
      return;
    }

    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove]);

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

  const movesLeft = ADVANTAGE_MOVE_LIMIT - playerMoves;
  const boardDisabled = showIntro || result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>⚔️ Форы</Text>
        <Pressable style={styles.exitBtn} onPress={handleExit}>
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <Text style={styles.scoreBadge}>⭐ {scoreDisplay}</Text>
        <View style={[styles.moveBadge, movesLeft <= 5 && styles.moveBadgeUrgent]}>
          <Text style={styles.moveCount}>{Math.max(0, movesLeft)}</Text>
          <Text style={styles.moveLabel}>ходов</Text>
        </View>
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
        <Text style={styles.goal}>
          ⚔️ У соперника лишний ферзь на d6. Возьми его — бонус +{ADVANTAGE_EXTRA_QUEEN_BONUS}!
        </Text>
      </View>

      {showIntro && (
        <View style={styles.overlay}>
          <Text style={styles.resultEmoji}>♛</Text>
          <Text style={styles.introText}>У противника лишний ферзь. Удачи.</Text>
        </View>
      )}

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
  moveBadge:       { backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, alignItems: 'center', minWidth: 52 },
  moveBadgeUrgent: { backgroundColor: '#7f1d1d' },
  moveCount:       { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  moveLabel:       { color: '#94a3b8', fontSize: 10 },
  thinking:        { fontSize: 20 },
  boardWrap:       { flex: 1 },
  footer:          { paddingHorizontal: 16, paddingVertical: 8 },
  goal:            { color: '#64748b', fontSize: 12, textAlign: 'center' },
  overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  introText:       { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  resultEmoji:     { fontSize: 72 },
  resultTitle:     { color: '#fff', fontSize: 32, fontWeight: '900' },
  resultReason:    { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
  resultScore:     { color: '#ffd700', fontSize: 28, fontWeight: '800' },
  continueBtn:     { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
