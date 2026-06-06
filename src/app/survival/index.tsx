import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import { SURVIVAL_START_FEN, SURVIVAL_MOVE_LIMIT, addPieceToBoard } from '../../engine/survivalMode';
import { calcSurvivalScore, calcMateScore } from '../../engine/scoreEngine';
import { useRunStore } from '../../store/runStore';
import { eloToSkillLevel } from '../../engine/stockfish';

const PLAYER_COLOR = 'w' as const;

export default function SurvivalPage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, addScore, completeNode, setCurrentFen, isActive } = useRunStore();

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? 500;
  const skillLevel = eloToSkillLevel(opponentElo);

  const [chess] = useState(() => new Chess(SURVIVAL_START_FEN));
  const [boardKey, setBoardKey] = useState(0);
  const [survivedMoves, setSurvivedMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);

  const scoreRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isActive) { router.replace('/'); return null; }

  useEffect(() => () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); }, []);

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  function finishGame(r: 'win' | 'lose', reason: string, finalMoves: number) {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setResult(r);
    setResultReason(reason);
    setCurrentFen(chess.fen());
    if (r === 'win') {
      scoreRef.current = reason === 'Мат!'
        ? calcMateScore(finalMoves, SURVIVAL_MOVE_LIMIT) + calcSurvivalScore(finalMoves)
        : calcSurvivalScore(finalMoves);
    }
  }

  const applyAIMove = useCallback((uci: string, currentMoves: number) => {
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
      if (chess.isCheckmate()) finishGame('lose', 'Мат!', currentMoves);
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess]);

  const requestAIMove = useCallback((currentMoves: number) => {
    if (chess.isGameOver() || chess.turn() === PLAYER_COLOR) return;
    setIsAIThinking(true);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      aiTimeoutRef.current = null;
      if (chess.turn() === PLAYER_COLOR || chess.isGameOver()) return;
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return;
      const m = moves[Math.floor(Math.random() * moves.length)];
      applyAIMove(`${m.from}${m.to}${m.promotion ?? ''}`, currentMoves);
    }, 1500);
    sendToEngine(`position fen ${chess.fen()}`);
    sendToEngine('go movetime 400');
  }, [chess, applyAIMove, sendToEngine]);

  const handleEngineMessage = useCallback((line: string) => {
    if (!line.startsWith('bestmove')) return;
    const uci = line.split(' ')[1];
    if (!uci || uci === '0000') { setIsAIThinking(false); return; }
    // survivedMoves captured via closure at time of engine response
    applyAIMove(uci, survivedMoves);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyAIMove, survivedMoves]);

  useEffect(() => {
    if (engineReady && chess.turn() !== PLAYER_COLOR) requestAIMove(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  const handleMove = useCallback((moveResult: MoveResult) => {
    if (!moveResult.success || !moveResult.move) return;
    setOpponentLastMove(null);
    const newCount = survivedMoves + 1;
    setSurvivedMoves(newCount);

    if (moveResult.isCheckmate) {
      scoreRef.current = calcMateScore(newCount, SURVIVAL_MOVE_LIMIT) + calcSurvivalScore(newCount);
      finishGame('win', 'Мат!', newCount);
      return;
    }

    // Add a new white piece after each player move
    const newFen = addPieceToBoard(chess.fen(), newCount - 1);
    chess.load(newFen);
    setBoardKey(k => k + 1);

    if (newCount >= SURVIVAL_MOVE_LIMIT) {
      finishGame('win', 'Вы выжили!', newCount);
      return;
    }

    requestAIMove(newCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survivedMoves, chess, requestAIMove]);

  function handleContinue() {
    if (result === 'win') {
      addScore(scoreRef.current);
      completeNode(currentNodeIndex);
    }
    router.replace('/adventure');
  }

  function handleExit() {
    Alert.alert('Выйти из боя?', 'Прогресс потеряется.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => router.replace('/adventure') },
    ]);
  }

  const movesLeft = SURVIVAL_MOVE_LIMIT - survivedMoves;
  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Выживание</Text>
        <Pressable style={styles.exitBtn} onPress={handleExit}>
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <View style={[styles.moveBadge, movesLeft <= 8 && styles.moveBadgeUrgent]}>
          <Text style={styles.moveCount}>{movesLeft}</Text>
          <Text style={styles.moveLabel}>ходов</Text>
        </View>
        {isAIThinking && <Text style={styles.thinking}>⏳</Text>}
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
          🛡️ Продержитесь {SURVIVAL_MOVE_LIMIT} ходов или поставьте мат. После каждого хода — новая фигура!
        </Text>
      </View>

      {result && (
        <View style={styles.overlay}>
          <Text style={styles.resultEmoji}>{result === 'win' ? '🏆' : '💀'}</Text>
          <Text style={styles.resultTitle}>{result === 'win' ? 'Выжили!' : 'Поражение'}</Text>
          <Text style={styles.resultReason}>{resultReason}</Text>
          {result === 'win' && (
            <Text style={styles.resultScore}>+{scoreRef.current} 🎯</Text>
          )}
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
  resultScore:     { color: '#ffd700', fontSize: 28, fontWeight: '800' },
  continueBtn:     { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
