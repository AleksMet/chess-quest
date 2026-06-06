import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import { generateQuickBattlePosition } from '../../engine/positionGenerator';
import { selectSniperTarget, getSniperMoveLimit, getProtectiveMove } from '../../engine/sniperMode';
import { calcMateScore, calcCaptureScore } from '../../engine/scoreEngine';
import { useRunStore } from '../../store/runStore';
import { eloToSkillLevel } from '../../engine/stockfish';

const PLAYER_COLOR = 'w' as const;

export default function SniperPage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, addScore, completeNode, setCurrentFen, isActive } = useRunStore();

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? 500;
  const skillLevel = eloToSkillLevel(opponentElo);
  const moveLimit = getSniperMoveLimit(currentNodeIndex);

  const [startFen] = useState(() => generateQuickBattlePosition(false));
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);

  // Target piece tracking — follows the piece as it moves
  const [targetSquare, setTargetSquare] = useState<Square | null>(() =>
    selectSniperTarget(startFen, currentNodeIndex),
  );
  const targetSquareRef = useRef<Square | null>(targetSquare);
  targetSquareRef.current = targetSquare;

  const targetPieceType = useRef<string | null>(
    targetSquare ? new Chess(startFen).get(targetSquare)?.type ?? null : null,
  );

  const [scoreDisplay, setScoreDisplay] = useState(0);
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

  function finishGame(r: 'win' | 'lose', reason: string) {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
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

      // If AI moved the target piece, track its new position
      if (from === targetSquareRef.current) {
        setTargetSquare(to as Square);
      }

      if (chess.isCheckmate()) finishGame('lose', 'Мат!');
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
    // Переопределяем ход AI если цель под угрозой
    const target = targetSquareRef.current;
    const finalUci = target ? getProtectiveMove(chess, target, uci) : uci;
    applyAIMove(finalUci);
  }, [applyAIMove, chess]);

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
    const capturedOnTarget =
      move.to === targetSquareRef.current &&
      move.captured !== undefined &&
      move.captured === targetPieceType.current;

    if (capturedOnTarget) {
      const capScore = calcCaptureScore(move.captured!);
      const mateBonus = calcMateScore(newCount, moveLimit);
      scoreRef.current = capScore + Math.floor(mateBonus * 0.5);
      setScoreDisplay(scoreRef.current);
      finishGame('win', 'Цель захвачена!');
      return;
    }

    if (moveResult.isCheckmate) {
      scoreRef.current = calcMateScore(newCount, moveLimit);
      setScoreDisplay(scoreRef.current);
      finishGame('win', 'Мат!');
      return;
    }

    if (newCount >= moveLimit) {
      finishGame('lose', 'Лимит ходов');
      return;
    }

    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove, moveLimit]);

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

  const movesLeft = moveLimit - playerMoves;
  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>🎯 Снайпер</Text>
        <Pressable style={styles.exitBtn} onPress={handleExit}>
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <Text style={styles.scoreBadge}>⭐ {scoreDisplay}</Text>
        <View style={[styles.moveBadge, movesLeft <= 5 && styles.moveBadgeUrgent]}>
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
          highlightSquare={targetSquare ?? undefined}
          opponentLastMove={opponentLastMove}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.goal}>
          🎯 Захвати выделенную фигуру за {moveLimit} ходов
        </Text>
      </View>

      {result && (
        <View style={styles.overlay}>
          <Text style={styles.resultEmoji}>{result === 'win' ? '🏆' : '💀'}</Text>
          <Text style={styles.resultTitle}>{result === 'win' ? 'Цель уничтожена!' : 'Промах'}</Text>
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
  scoreBadge:      { color: '#fbbf24', fontSize: 15, fontWeight: '700' },
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
