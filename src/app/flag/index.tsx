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
import { selectFlagSquare, isFlagCaptured, FLAG_HOLD_REQUIRED, getFlagAwareMove } from '../../engine/flagMode';
import { calcFlagHoldScore, calcMateScore } from '../../engine/scoreEngine';
import { useRunStore } from '../../store/runStore';
import { eloToSkillLevel } from '../../engine/stockfish';

const PLAYER_COLOR = 'w' as const;
const MOVE_LIMIT = 20;

export default function FlagPage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, addScore, completeNode, setCurrentFen, isActive } = useRunStore();

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? 500;
  const skillLevel = eloToSkillLevel(opponentElo);

  const [startFen] = useState(() => generateQuickBattlePosition(false));
  const [chess] = useState(() => new Chess(startFen));
  const [flagSquare] = useState<Square>(() => selectFlagSquare());
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [playerHold, setPlayerHold] = useState(0);
  const [opponentHold, setOpponentHold] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);

  const [scoreDisplay, setScoreDisplay] = useState(0);
  const scoreRef = useRef(0);
  const playerHoldRef = useRef(0);
  const opponentHoldRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isActive) { router.replace('/'); return null; }

  useEffect(() => () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); }, []);

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  function finishGame(r: 'win' | 'lose', reason: string, moves: number) {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setResult(r);
    setResultReason(reason);
    setCurrentFen(chess.fen());
    if (r === 'win') {
      const flagScore = calcFlagHoldScore(playerHoldRef.current);
      const mateBonus = reason === 'Мат!' ? calcMateScore(moves, MOVE_LIMIT) : 0;
      scoreRef.current = flagScore + mateBonus;
      setScoreDisplay(scoreRef.current);
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

      if (chess.isCheckmate()) {
        finishGame('lose', 'Мат!', currentMoves);
        return;
      }

      // Check opponent flag capture after their move
      const opponentOnFlag = isFlagCaptured(chess.fen(), flagSquare, 'b');
      const newOpponentHold = opponentOnFlag ? opponentHoldRef.current + 1 : 0;
      opponentHoldRef.current = newOpponentHold;
      setOpponentHold(newOpponentHold);

      if (newOpponentHold >= FLAG_HOLD_REQUIRED) {
        finishGame('lose', 'Флаг захвачен противником!', currentMoves);
      }
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, flagSquare]);

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
    // Переопределяем ход AI с учётом флага
    const flagUci = getFlagAwareMove(chess, flagSquare, playerHoldRef.current, opponentHoldRef.current, uci);
    applyAIMove(flagUci, playerMoves);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyAIMove, playerMoves, chess, flagSquare]);

  useEffect(() => {
    if (engineReady && chess.turn() !== PLAYER_COLOR) requestAIMove(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  const handleMove = useCallback((moveResult: MoveResult) => {
    if (!moveResult.success || !moveResult.move) return;
    setOpponentLastMove(null);
    const newCount = playerMoves + 1;
    setPlayerMoves(newCount);
    setBoardKey(k => k + 1);

    if (moveResult.isCheckmate) {
      const mateScore = calcMateScore(newCount, MOVE_LIMIT);
      const flagBonus = calcFlagHoldScore(playerHoldRef.current);
      scoreRef.current = mateScore + flagBonus;
      finishGame('win', 'Мат!', newCount);
      return;
    }

    // Check player flag capture after their move
    const playerOnFlag = isFlagCaptured(chess.fen(), flagSquare, 'w');
    const newPlayerHold = playerOnFlag ? playerHoldRef.current + 1 : 0;
    playerHoldRef.current = newPlayerHold;
    setPlayerHold(newPlayerHold);

    // Reset opponent hold if player just took the flag square
    if (playerOnFlag) {
      opponentHoldRef.current = 0;
      setOpponentHold(0);
    }

    if (newPlayerHold >= FLAG_HOLD_REQUIRED) {
      finishGame('win', `Флаг удержан ${FLAG_HOLD_REQUIRED} хода!`, newCount);
      return;
    }

    if (newCount >= MOVE_LIMIT) {
      finishGame('lose', 'Лимит ходов', newCount);
      return;
    }

    requestAIMove(newCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove, flagSquare]);

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

  const movesLeft = MOVE_LIMIT - playerMoves;
  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>🚩 Захват флага</Text>
        <Pressable style={styles.exitBtn} onPress={handleExit}>
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <Text style={styles.scoreBadge}>⭐ {scoreDisplay}</Text>
        <View style={styles.holdBar}>
          <Text style={styles.holdLabel}>Флаг: {playerHold}/{FLAG_HOLD_REQUIRED}</Text>
          <View style={styles.holdDots}>
            {Array.from({ length: FLAG_HOLD_REQUIRED }).map((_, i) => (
              <View
                key={i}
                style={[styles.holdDot, i < playerHold && styles.holdDotFilled]}
              />
            ))}
          </View>
        </View>
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
          highlightSquare={flagSquare}
          opponentLastMove={opponentLastMove}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.goal}>
          🚩 Держи фигуру на {flagSquare.toUpperCase()} в течение {FLAG_HOLD_REQUIRED} ходов подряд
        </Text>
        {opponentHold > 0 && (
          <Text style={styles.danger}>
            ⚠️ Противник удерживает флаг: {opponentHold}/{FLAG_HOLD_REQUIRED}
          </Text>
        )}
      </View>

      {result && (
        <View style={styles.overlay}>
          <Text style={styles.resultEmoji}>{result === 'win' ? '🏆' : '💀'}</Text>
          <Text style={styles.resultTitle}>{result === 'win' ? 'Флаг захвачен!' : 'Поражение'}</Text>
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
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  title:           { flex: 1, color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  exitBtn:         { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:     { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  scoreBadge:      { color: '#fbbf24', fontSize: 15, fontWeight: '700' },
  holdBar:         { alignItems: 'center', gap: 2 },
  holdLabel:       { color: '#94a3b8', fontSize: 10 },
  holdDots:        { flexDirection: 'row', gap: 4 },
  holdDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1e3a5f', borderWidth: 1, borderColor: '#22c55e' },
  holdDotFilled:   { backgroundColor: '#22c55e' },
  moveBadge:       { backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 48 },
  moveBadgeUrgent: { backgroundColor: '#7f1d1d' },
  moveCount:       { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  moveLabel:       { color: '#94a3b8', fontSize: 10 },
  thinking:        { fontSize: 20 },
  boardWrap:       { flex: 1 },
  footer:          { paddingHorizontal: 16, paddingVertical: 6, gap: 4 },
  goal:            { color: '#64748b', fontSize: 12, textAlign: 'center' },
  danger:          { color: '#ef4444', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resultEmoji:     { fontSize: 72 },
  resultTitle:     { color: '#fff', fontSize: 32, fontWeight: '900' },
  resultReason:    { color: '#94a3b8', fontSize: 16 },
  resultScore:     { color: '#ffd700', fontSize: 28, fontWeight: '800' },
  continueBtn:     { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
