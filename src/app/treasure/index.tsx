import { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
// TODO: ХАОС режим — restore: import { ArtifactCard } from '../../components/artifacts/ArtifactCard';
import { useRunStore } from '../../store/runStore';
// TODO: ХАОС режим — restore: import { ARTIFACTS } from '../../data/artifacts';
import { countWhitePieceInFen } from '../../engine/positionGenerator';
// TODO: ХАОС режим — restore: import type { Artifact } from '../../types';
import type { PieceSymbol } from 'chess.js';

// TODO: ХАОС режим — restore 'artifact' phase
type Phase = 'choose' | 'bless';

const PIECE_INFO: { type: PieceSymbol; symbol: string; name: string }[] = [
  { type: 'q', symbol: '♛', name: 'Ферзь' },
  { type: 'r', symbol: '♜', name: 'Ладья' },
  { type: 'b', symbol: '♝', name: 'Слон' },
  { type: 'n', symbol: '♞', name: 'Конь' },
  { type: 'p', symbol: '♟', name: 'Пешка' },
];

const BLESSED_BONUS = 15;

// TODO: ХАОС режим — restore pickArtifacts function

export default function TreasureScreen() {
  const router = useRouter();
  const {
    currentFen, addScore,
    blessPiece, completeNode, currentNodeIndex,
  } = useRunStore();

  const [phase, setPhase] = useState<Phase>('choose');
  const scoreReward = useMemo(() => 80 + Math.floor(Math.random() * 41), []);
  // TODO: ХАОС режим — restore: const artifactChoices = useMemo(() => pickArtifacts(artifacts), []);

  function finish() {
    completeNode(currentNodeIndex);
    router.replace('/adventure');
  }

  // TODO: ХАОС режим — restore handlePickArtifact when artifacts are re-enabled

  function handlePickScore() {
    addScore(scoreReward);
    finish();
  }

  function handlePickBless(piece: PieceSymbol) {
    blessPiece(piece);
    finish();
  }

  // ── CHOOSE phase ─────────────────────────────────────────────────────────────
  if (phase === 'choose') {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>💎 Сокровищница</Text>
        <Text style={styles.subtitle}>Выбери награду:</Text>
        <View style={styles.optionGrid}>

          {/* TODO: ХАОС режим — restore Artifact option */}

          {/* Score bonus */}
          <Pressable style={[styles.optionCard, styles.cardGold]} onPress={handlePickScore} testID="treasure-gold">
            <Text style={styles.optionEmoji}>🎯</Text>
            <Text style={styles.optionTitle}>Очки</Text>
            <Text style={styles.optionGold}>+{scoreReward} 🎯</Text>
          </Pressable>

          {/* Bless */}
          <Pressable style={[styles.optionCard, styles.cardBless]} onPress={() => setPhase('bless')} testID="treasure-bless">
            <Text style={styles.optionEmoji}>✨</Text>
            <Text style={styles.optionTitle}>Благословение</Text>
            <Text style={styles.optionDesc}>{`+${BLESSED_BONUS} очков за каждый ход\nблагословлённой фигурой`}</Text>
          </Pressable>

        </View>
      </SafeAreaView>
    );
  }

  // ── BLESS phase ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>✨ Благословение</Text>
      <Text style={styles.subtitle}>{`Выбери фигуру — она даёт +${BLESSED_BONUS} 💰 за каждый ход`}</Text>
      <ScrollView contentContainerStyle={styles.pieceGrid}>
        {PIECE_INFO.map(({ type, symbol, name }) => {
          const count = countWhitePieceInFen(currentFen, type);
          const available = count > 0;
          return (
            <Pressable
              key={type}
              testID={`bless-piece-${type}`}
              style={[styles.pieceCard, !available && styles.pieceCardDisabled]}
              onPress={() => available && handlePickBless(type)}
            >
              <Text style={styles.pieceSymbol}>{symbol}</Text>
              <View>
                <Text style={[styles.pieceName, !available && styles.dimText]}>{name}</Text>
                <Text style={[styles.pieceCount, !available && styles.dimText]}>
                  {available ? `×${count}` : 'нет'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable style={styles.skipBtn} onPress={finish} testID="skip-bless-btn">
        <Text style={styles.skipText}>Пропустить</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  title:             { color: '#f1f5f9', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle:          { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 20 },

  // choose phase
  optionGrid:        { flex: 1, gap: 14 },
  optionCard:        { borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 2 },
  cardArtifact:      { backgroundColor: '#0f1f3a', borderColor: '#2196f3' },
  cardGold:          { backgroundColor: '#1a1200', borderColor: '#f59e0b' },
  cardBless:         { backgroundColor: '#1a0f2e', borderColor: '#a78bfa' },
  optionEmoji:       { fontSize: 36 },
  optionTitle:       { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  optionDesc:        { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  optionGold:        { color: '#ffd700', fontSize: 22, fontWeight: '900' },

  // artifact phase
  artifactList:      { flex: 1 },

  // bless phase
  pieceGrid:         { gap: 10, paddingBottom: 8 },
  pieceCard:         { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#a78bfa' },
  pieceCardDisabled: { opacity: 0.35, borderColor: '#334155' },
  pieceSymbol:       { fontSize: 36, width: 40, textAlign: 'center' },
  pieceName:         { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  pieceCount:        { color: '#94a3b8', fontSize: 13 },
  dimText:           { color: '#475569' },

  skipBtn:           { alignSelf: 'center', marginTop: 12, paddingVertical: 10, paddingHorizontal: 32, borderRadius: 12, backgroundColor: '#1e293b' },
  skipText:          { color: '#64748b', fontSize: 14 },
});
