import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import { generateQuickBattlePosition, countMaterial } from '../../engine/positionGenerator';
import { useRunStore } from '../../store/runStore';
import { eloToSkillLevel } from '../../engine/stockfish';

const PLAYER_MOVE_LIMIT = 15;
const PLAYER_COLOR = 'w' as const;

export default function QuickBattlePage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, earnGold, completeNode, setCurrentFen, isActive } = useRunStore();

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? 500;
  const skillLevel = eloToSkillLevel(opponentElo);

  const [startFen] = useState(() => generateQuickBattlePosition());
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');

  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isActive) {
    router.replace('/');
    return null;
  }

  useEffect(() => () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); }, []);

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  function finishGame(r: 'win' | 'lose' | 'draw', reason: string) {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setResult(r);
    setResultReason(reason);
    const fen = chess.fen();
    setCurrentFen(fen);
  }

  function checkMaterialResult() {
    const playerMat = countMaterial(chess, PLAYER_COLOR);
    const aiMat = countMaterial(chess, 'b');
    if (playerMat > aiMat) finishGame('win', `Материал: ${playerMat}:${aiMat}`);
    else if (aiMat > playerMat) finishGame('lose', `Материал: ${playerMat}:${aiMat}`);
    else finishGame('draw', 'Равный материал');
  }

  const applyAIMove = useCallback((uci: string) => {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    const from = uci.slice(0, 2); const to = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | undefined;
    try {
      const move = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }
      setBoardKey(k => k + 1);
      setIsAIThinking(false);
      if (chess.isCheckmate()) finishGame('lose', 'Мат!');
      else if (chess.isDraw() || chess.isStalemate()) finishGame('draw', 'Ничья');
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
    if (!moveResult.success) return;
    const newCount = playerMoves + 1;
    setPlayerMoves(newCount);
    setBoardKey(k => k + 1);

    if (moveResult.isCheckmate) { finishGame('win', 'Мат!'); return; }
    if (moveResult.isDraw || moveResult.isStalemate) { finishGame('draw', 'Ничья'); return; }

    if (newCount >= PLAYER_MOVE_LIMIT) {
      checkMaterialResult();
      return;
    }
    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove]);

  function handleContinue() {
    const goldReward = result === 'win' ? 80 : result === 'draw' ? 30 : 10;
    earnGold(goldReward);
    if (result !== 'lose') completeNode(currentNodeIndex);
    router.replace('/adventure');
  }

  function handleExit() {
    Alert.alert(
      'Выйти из боя?',
      'Прогресс потеряется.',
      [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => router.replace('/adventure') },
      ],
    );
  }

  const movesLeft = PLAYER_MOVE_LIMIT - playerMoves;
  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>⚡ Быстрый бой</Text>
        <Pressable style={styles.exitBtn} onPress={handleExit} testID="exit-battle-btn">
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <View style={[styles.moveBadge, movesLeft <= 5 && styles.moveBadgeUrgent]}>
          <Text style={styles.moveCount}>{movesLeft}</Text>
          <Text style={styles.moveLabel}>ходов</Text>
        </View>
        {isAIThinking && <Text style={styles.thinking}>⏳</Text>}
      </View>

      <ChessBoard
        key={boardKey}
        chess={chess}
        playerColor={PLAYER_COLOR}
        onMove={handleMove}
        disabled={boardDisabled}
      />

      <View style={styles.footer}>
        <Text style={styles.goal}>🎯 Цель: мат или больше материала за {PLAYER_MOVE_LIMIT} ходов</Text>
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
          <Text style={styles.resultGold}>
            {result === 'win' ? '+80 💰' : result === 'draw' ? '+30 💰' : '+10 💰'}
          </Text>
          <Pressable style={styles.continueBtn} onPress={handleContinue} testID="quick-battle-continue">
            <Text style={styles.continueBtnText}>Продолжить</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#0d1117' },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  title:             { flex: 1, color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  exitBtn:           { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:       { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  moveBadge:         { backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, alignItems: 'center', minWidth: 52 },
  moveBadgeUrgent:   { backgroundColor: '#7f1d1d' },
  moveCount:         { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  moveLabel:         { color: '#94a3b8', fontSize: 10 },
  thinking:          { fontSize: 20 },
  footer:            { paddingHorizontal: 16, paddingVertical: 8 },
  goal:              { color: '#64748b', fontSize: 12, textAlign: 'center' },
  overlay:           { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resultEmoji:       { fontSize: 72 },
  resultTitle:       { color: '#fff', fontSize: 36, fontWeight: '900' },
  resultReason:      { color: '#94a3b8', fontSize: 16 },
  resultGold:        { color: '#ffd700', fontSize: 28, fontWeight: '800' },
  continueBtn:       { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText:   { color: '#fff', fontSize: 17, fontWeight: '800' },
});
