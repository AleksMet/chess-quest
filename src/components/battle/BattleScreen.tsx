import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Chess } from 'chess.js';
import type { Color } from 'chess.js';
import { ChessBoard } from '../chess/ChessBoard';
import type { MoveResult } from '../../engine/chessLogic';
import { processMove } from '../../engine/rewardEngine';
import type { Artifact, BattleContext, Hero } from '../../types';

const RARITY_COLORS: Record<string, string> = {
  common: '#9e9e9e',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800',
  mythic: '#f44336',
};

interface BattleScreenProps {
  artifacts?: Artifact[];
  hero: Hero;
  playerColor?: Color;
  opponentName?: string;
  opponentElo?: number;
  onGameEnd?: (result: 'win' | 'lose' | 'draw', gold: number) => void;
}

export function BattleScreen({
  artifacts = [],
  hero,
  playerColor = 'w',
  opponentName = 'Противник',
  opponentElo = 500,
  onGameEnd,
}: BattleScreenProps) {
  const [chess] = useState(() => new Chess());
  const [gold, setGold] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const kingCheckedRef = useRef(false);

  const goldScale = useSharedValue(1);
  const goldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goldScale.value }],
  }));

  const handleMove = useCallback(
    (result: MoveResult) => {
      if (!result.success || !result.move) return;

      // Track if player's king was checked (by opponent's move — detect check flag)
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
          withTiming(1.0, { duration: 300 })
        );
        setLog(prev => [...prev, ...reward.log].slice(-8));
      }

      if (result.isCheckmate) {
        const playerWon = chess.turn() !== playerColor;
        const finalResult = playerWon ? 'win' : 'lose';
        setGameResult(finalResult);
        onGameEnd?.(finalResult, gold + reward.gold);
      } else if (result.isDraw || result.isStalemate) {
        setGameResult('draw');
        onGameEnd?.('draw', gold + reward.gold);
      }
    },
    [chess, gold, artifacts, hero, playerColor, goldScale, onGameEnd]
  );

  return (
    <View style={styles.container} testID="battle-screen">
      <View style={styles.opponentBar} testID="opponent-bar">
        <Text style={styles.opponentName}>{opponentName}</Text>
        <Text style={styles.opponentElo}>ELO {opponentElo}</Text>
      </View>

      <ChessBoard
        chess={chess}
        playerColor={playerColor}
        onMove={handleMove}
        disabled={gameResult !== null}
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
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  opponentBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#16213e',
  },
  opponentName: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '600',
  },
  opponentElo: {
    color: '#9e9e9e',
    fontSize: 13,
  },
  hud: {
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  goldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0f3460',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 4,
  },
  goldIcon: {
    fontSize: 18,
  },
  goldAmount: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: '700',
  },
  artifactRow: {
    flexDirection: 'row',
  },
  artifactSlot: {
    width: 80,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#0f3460',
  },
  artifactEmpty: {
    borderColor: '#2a2a4e',
    borderStyle: 'dashed',
  },
  artifactName: {
    color: '#e0e0e0',
    fontSize: 10,
    textAlign: 'center',
  },
  logContainer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 2,
  },
  logEntry: {
    color: '#ffd700',
    fontSize: 12,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resultText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
  },
  resultGold: {
    color: '#ffd700',
    fontSize: 22,
    fontWeight: '600',
  },
  resultButton: {
    marginTop: 8,
    backgroundColor: '#e94560',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  resultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
