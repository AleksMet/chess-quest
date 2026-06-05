import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import { generateQuickBattlePosition } from '../../engine/positionGenerator';
import { processMove } from '../../engine/rewardEngine';
import { GoldPopup } from '../../components/ui/GoldPopup';
import { useRunStore } from '../../store/runStore';
import { HEROES } from '../../data/heroes';
import { eloToSkillLevel } from '../../engine/stockfish';
import type { RewardBreakdownItem } from '../../types';

const PLAYER_MOVE_LIMIT = 15;
const PLAYER_COLOR = 'w' as const;
const CAPTURE_VALUES: Record<string, number> = { p: 8, n: 25, b: 25, r: 40, q: 70, k: 0 };
const WIN_GOLD = 100;
const LOSE_GOLD = 10;

export default function QuickBattlePage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, heroId, artifacts, earnGold, completeNode, setCurrentFen, markKingChecked, isActive } = useRunStore();
  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0];

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? 500;
  const skillLevel = eloToSkillLevel(opponentElo);

  const isPreBoss = currentNodeIndex === 4; // floor 5 (0-indexed) = last before boss
  const [startFen] = useState(() => generateQuickBattlePosition(isPreBoss));
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [, setMoveGoldAcc] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [popup, setPopup] = useState<{ total: number; breakdown: RewardBreakdownItem[] } | null>(null);
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);

  const moveGoldRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isActive) { router.replace('/'); return null; }

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
    setCurrentFen(chess.fen());
  }


  const applyAIMove = useCallback((uci: string) => {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    const from = uci.slice(0, 2); const to = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | undefined;
    try {
      const move = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }
      setOpponentLastMove({ from, to });
      setBoardKey(k => k + 1);
      setIsAIThinking(false);
      // Check if AI put player's king in check
      if (chess.isCheck() && chess.turn() === PLAYER_COLOR) markKingChecked();
      if (chess.isCheckmate()) finishGame('lose', 'Мат!');
      else if (chess.isDraw() || chess.isStalemate()) finishGame('draw', 'Ничья');
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, markKingChecked]);

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

    // Reward engine
    const captureGold = moveResult.move.captured ? (CAPTURE_VALUES[moveResult.move.captured] ?? 0) : 0;
    const reward = processMove({
      chess,
      move: moveResult.move,
      positionFenBefore: chess.fen(),
      goldBalance: moveGoldRef.current,
      artifacts,
      hero,
      moveNumber: newCount,
      playerColor: PLAYER_COLOR,
    });
    const moveGold = captureGold + reward.gold;
    if (moveGold > 0) {
      moveGoldRef.current += moveGold;
      setMoveGoldAcc(prev => prev + moveGold);
      const breakdown: RewardBreakdownItem[] = [];
      if (captureGold > 0) breakdown.push({ label: 'взятие', value: captureGold, type: 'base' });
      breakdown.push(...reward.breakdown);
      setPopup({ total: moveGold, breakdown });
    }

    if (moveResult.isCheckmate) { finishGame('win', 'Мат!'); return; }
    if (moveResult.isDraw || moveResult.isStalemate) { finishGame('draw', 'Ничья'); return; }

    if (newCount >= PLAYER_MOVE_LIMIT) { finishGame('draw', 'Лимит ходов'); return; }
    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove, artifacts, hero]);

  function handleContinue() {
    if (result === 'win') {
      earnGold(moveGoldRef.current + WIN_GOLD);
      // artifact-selection handles completeNode
      router.replace('/artifact-selection');
    } else if (result === 'draw') {
      // Draw = 0 gold regardless of move-earned gold
      completeNode(currentNodeIndex);
      router.replace('/adventure');
    } else {
      earnGold(moveGoldRef.current + LOSE_GOLD);
      router.replace('/adventure');
    }
  }

  function handleExit() {
    Alert.alert('Выйти из боя?', 'Прогресс потеряется.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => router.replace('/adventure') },
    ]);
  }

  const movesLeft = PLAYER_MOVE_LIMIT - playerMoves;
  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;
  const totalGoldDisplay = result === 'win' ? moveGoldRef.current + WIN_GOLD : result === 'draw' ? 0 : moveGoldRef.current + LOSE_GOLD;

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

      <View style={styles.boardWrap}>
        <ChessBoard
          key={boardKey}
          chess={chess}
          playerColor={PLAYER_COLOR}
          onMove={handleMove}
          disabled={boardDisabled}
          opponentLastMove={opponentLastMove}
        />
        {popup && (
          <GoldPopup
            key={`popup_${moveGoldRef.current}`}
            total={popup.total}
            breakdown={popup.breakdown}
            onDone={() => setPopup(null)}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.goal}>🎯 Мат или больше материала за {PLAYER_MOVE_LIMIT} ходов</Text>
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
          <Text style={styles.resultGold}>+{totalGoldDisplay} 💰</Text>
          <Pressable style={styles.continueBtn} onPress={handleContinue} testID="quick-battle-continue">
            <Text style={styles.continueBtnText}>Продолжить</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#0d1117' },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  title:            { flex: 1, color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  exitBtn:          { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:      { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  moveBadge:        { backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, alignItems: 'center', minWidth: 52 },
  moveBadgeUrgent:  { backgroundColor: '#7f1d1d' },
  moveCount:        { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  moveLabel:        { color: '#94a3b8', fontSize: 10 },
  thinking:         { fontSize: 20 },
  boardWrap:        { position: 'relative', flex: 1 },
  footer:           { paddingHorizontal: 16, paddingVertical: 8 },
  goal:             { color: '#64748b', fontSize: 12, textAlign: 'center' },
  overlay:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resultEmoji:      { fontSize: 72 },
  resultTitle:      { color: '#fff', fontSize: 36, fontWeight: '900' },
  resultReason:     { color: '#94a3b8', fontSize: 16 },
  resultGold:       { color: '#ffd700', fontSize: 28, fontWeight: '800' },
  continueBtn:      { marginTop: 16, backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
});
