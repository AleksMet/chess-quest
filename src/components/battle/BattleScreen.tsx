import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Chess } from 'chess.js';
import type { Color, Move } from 'chess.js';
import { ChessBoard } from '../chess/ChessBoard';
import { StockfishBridgeView } from '../engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import { processMove } from '../../engine/rewardEngine';
import type { Artifact, BattleContext, Hero } from '../../types';

const RARITY_COLORS: Record<string, string> = {
  common:    '#9e9e9e',
  rare:      '#2196f3',
  epic:      '#9c27b0',
  legendary: '#ff9800',
  mythic:    '#f44336',
};

// Pick a random legal move, preferring captures ~60% of the time.
function pickFallbackMove(chess: Chess): string | null {
  const moves: Move[] = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const captures = moves.filter(m => m.captured);
  const pool = captures.length > 0 && Math.random() < 0.6 ? captures : moves;
  const m = pool[Math.floor(Math.random() * pool.length)];
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

interface BattleScreenProps {
  artifacts?:    Artifact[];
  hero:          Hero;
  playerColor?:  Color;
  opponentName?: string;
  opponentElo?:  number;
  skillLevel?:   number;
  onGameEnd?:    (result: 'win' | 'lose' | 'draw', gold: number) => void;
}

export function BattleScreen({
  artifacts = [],
  hero,
  playerColor = 'w',
  opponentName = 'Противник',
  opponentElo = 500,
  skillLevel = 5,
  onGameEnd,
}: BattleScreenProps) {
  const [chess] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);
  const [gold, setGold] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  const kingCheckedRef = useRef(false);
  const engineRef = useRef<StockfishBridgeRef>(null);
  // Fallback timer: fires when WebView engine doesn't respond in time
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goldScale = useSharedValue(1);
  const goldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goldScale.value }],
  }));

  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, []);

  // ── Send UCI command to WebView engine ──────────────────────────────────────
  const sendToEngine = useCallback((cmd: string) => {
    engineRef.current?.send(cmd);
  }, []);

  // ── Handle engine ready ─────────────────────────────────────────────────────
  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  // ── Shared: apply a UCI move string from engine or fallback ─────────────────
  const applyAIMove = useCallback((uci: string) => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    const from = uci.slice(0, 2);
    const to   = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;

    try {
      const move = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }

      setBoardKey(k => k + 1);
      setIsAIThinking(false);

      if (chess.isCheckmate()) {
        const playerWon = chess.turn() === playerColor;
        const result = playerWon ? 'win' : 'lose';
        setGameResult(result);
        onGameEnd?.(result, gold);
      } else if (chess.isDraw() || chess.isStalemate()) {
        setGameResult('draw');
        onGameEnd?.('draw', gold);
      }
    } catch {
      setIsAIThinking(false);
    }
  }, [chess, playerColor, gold, onGameEnd]);

  // ── Handle bestmove response from engine ────────────────────────────────────
  const handleEngineMessage = useCallback((line: string) => {
    if (!line.startsWith('bestmove')) return;

    const uci = line.split(' ')[1];
    if (!uci || uci === '0000') {
      setIsAIThinking(false);
      return;
    }
    applyAIMove(uci);
  }, [applyAIMove]);

  // ── Schedule fallback random move if engine silent for 1500 ms ──────────────
  const scheduleFallback = useCallback(() => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      aiTimeoutRef.current = null;
      // Guard: might have already resolved via engine or player moved
      if (chess.turn() === playerColor || chess.isGameOver()) return;
      const uci = pickFallbackMove(chess);
      if (uci) applyAIMove(uci);
    }, 1500);
  }, [chess, playerColor, applyAIMove]);

  // ── Request AI move ─────────────────────────────────────────────────────────
  const requestAIMove = useCallback(() => {
    if (chess.isGameOver()) return;
    if (chess.turn() === playerColor) return;

    const legalMoves = chess.moves({ verbose: true }).map(m => `${m.from}${m.to}${m.promotion ?? ''}`);
    if (legalMoves.length === 0) return;

    setIsAIThinking(true);
    scheduleFallback();

    sendToEngine(`position fen ${chess.fen()} legal ${legalMoves.join(' ')}`);
    sendToEngine('go movetime 500');
  }, [chess, playerColor, sendToEngine, scheduleFallback]);

  // ── Trigger AI immediately when engine becomes ready (if it's AI's turn) ───
  useEffect(() => {
    if (engineReady && chess.turn() !== playerColor) {
      requestAIMove();
    }
  }, [engineReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Player move handler ─────────────────────────────────────────────────────
  const handleMove = useCallback(
    (result: MoveResult) => {
      if (!result.success || !result.move) return;

      if (result.isCheck && chess.turn() === playerColor) {
        kingCheckedRef.current = true;
      }

      const context: BattleContext = {
        chess,
        move: result.move,
        positionFenBefore: chess.fen(),
        goldBalance: gold,
        artifacts,
        hero,
        moveNumber: chess.history().length,
        playerColor,
        kingCheckedThisGame: kingCheckedRef.current,
      };

      const reward = processMove(context);

      if (reward.gold > 0) {
        setGold(prev => prev + reward.gold);
        goldScale.value = withSequence(
          withSpring(1.4, { damping: 6 }),
          withTiming(1.0, { duration: 300 }),
        );
        setLog(prev => [...prev, ...reward.log].slice(-8));
      }

      if (result.isCheckmate) {
        const playerWon = chess.turn() !== playerColor;
        const finalResult = playerWon ? 'win' : 'lose';
        setGameResult(finalResult);
        onGameEnd?.(finalResult, gold + reward.gold);
        return;
      }
      if (result.isDraw || result.isStalemate) {
        setGameResult('draw');
        onGameEnd?.('draw', gold + reward.gold);
        return;
      }

      // Opponent's turn — try engine, fallback handles silence automatically
      requestAIMove();
    },
    [chess, gold, artifacts, hero, playerColor, goldScale, onGameEnd, requestAIMove],
  );

  const boardDisabled = gameResult !== null || isAIThinking || chess.turn() !== playerColor;

  return (
    <View style={styles.container} testID="battle-screen">
      {/* Hidden WebView engine — must be mounted inside the component tree */}
      <StockfishBridgeView
        ref={engineRef}
        onMessage={handleEngineMessage}
        onReady={handleEngineReady}
      />

      <View style={styles.opponentBar} testID="opponent-bar">
        <Text style={styles.opponentName}>{opponentName}</Text>
        <Text style={styles.opponentElo}>
          ELO {opponentElo}{isAIThinking ? '  ⏳' : ''}
        </Text>
      </View>

      <ChessBoard
        key={boardKey}
        chess={chess}
        playerColor={playerColor}
        onMove={handleMove}
        disabled={boardDisabled}
      />

      <View style={styles.hud} testID="hud">
        <Animated.View style={[styles.goldContainer, goldStyle]} testID="gold-display">
          <Text style={styles.goldIcon}>💰</Text>
          <Text style={styles.goldAmount} testID="gold-amount">{gold}</Text>
        </Animated.View>

        <ScrollView
          horizontal
          style={styles.artifactRow}
          showsHorizontalScrollIndicator={false}
          testID="artifact-row"
        >
          {artifacts.map(a => (
            <View
              key={a.id}
              testID={`artifact-slot-${a.id}`}
              style={[styles.artifactSlot, { borderColor: RARITY_COLORS[a.rarity] ?? '#9e9e9e' }]}
            >
              <Text style={styles.artifactName} numberOfLines={1}>{a.name}</Text>
            </View>
          ))}
          {Array.from({ length: Math.max(0, 6 - artifacts.length) }).map((_, i) => (
            <View key={`empty-${i}`} style={[styles.artifactSlot, styles.artifactEmpty]} />
          ))}
        </ScrollView>
      </View>

      {log.length > 0 && (
        <View style={styles.logContainer} testID="reward-log">
          {log.slice(-3).map((msg, i) => (
            <Text key={i} style={styles.logEntry}>{msg}</Text>
          ))}
        </View>
      )}

      {gameResult && (
        <View style={styles.resultOverlay} testID="game-result">
          <Text style={styles.resultText}>
            {gameResult === 'win' ? '🏆 Победа!' : gameResult === 'lose' ? '💀 Поражение' : '🤝 Ничья'}
          </Text>
          <Text style={styles.resultGold}>Золото: {gold}</Text>
          <Pressable style={styles.resultButton} onPress={() => onGameEnd?.(gameResult, gold)}>
            <Text style={styles.resultButtonText}>Продолжить</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center' },
  opponentBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#16213e' },
  opponentName:    { color: '#e0e0e0', fontSize: 16, fontWeight: '600' },
  opponentElo:     { color: '#9e9e9e', fontSize: 13 },
  hud:             { width: '100%', paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  goldContainer:   { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#0f3460', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, gap: 4 },
  goldIcon:        { fontSize: 18 },
  goldAmount:      { color: '#ffd700', fontSize: 20, fontWeight: '700' },
  artifactRow:     { flexDirection: 'row' },
  artifactSlot:    { width: 80, height: 44, borderRadius: 8, borderWidth: 2, marginRight: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: '#0f3460' },
  artifactEmpty:   { borderColor: '#2a2a4e', borderStyle: 'dashed' },
  artifactName:    { color: '#e0e0e0', fontSize: 10, textAlign: 'center' },
  logContainer:    { width: '100%', paddingHorizontal: 12, paddingTop: 4, gap: 2 },
  logEntry:        { color: '#ffd700', fontSize: 12 },
  resultOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  resultText:      { color: '#fff', fontSize: 36, fontWeight: '800' },
  resultGold:      { color: '#ffd700', fontSize: 22, fontWeight: '600' },
  resultButton:    { marginTop: 8, backgroundColor: '#e94560', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  resultButtonText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
});
