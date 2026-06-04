import { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArtifactCard } from '../../components/artifacts/ArtifactCard';
import { useRunStore } from '../../store/runStore';
import { ARTIFACTS } from '../../data/artifacts';
import { countWhitePieceInFen } from '../../engine/positionGenerator';
import type { Artifact } from '../../types';
import type { PieceSymbol } from 'chess.js';

type Phase = 'choose' | 'artifact' | 'bless';

const PIECE_INFO: { type: PieceSymbol; symbol: string; name: string }[] = [
  { type: 'q', symbol: '♛', name: 'Ферзь' },
  { type: 'r', symbol: '♜', name: 'Ладья' },
  { type: 'b', symbol: '♝', name: 'Слон' },
  { type: 'n', symbol: '♞', name: 'Конь' },
  { type: 'p', symbol: '♟', name: 'Пешка' },
];

const BLESSED_BONUS = 15;

function pickArtifacts(owned: Artifact[]): Artifact[] {
  const ownedIds = new Set(owned.map(a => a.id));
  const pool = ARTIFACTS.filter(a => !ownedIds.has(a.id));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
}

export default function TreasureScreen() {
  const router = useRouter();
  const {
    artifacts, currentFen, addArtifact,
    earnGold, blessPiece, completeNode, currentNodeIndex,
  } = useRunStore();

  const [phase, setPhase] = useState<Phase>('choose');
  const goldReward = useMemo(() => 80 + Math.floor(Math.random() * 41), []);
  const artifactChoices = useMemo(() => pickArtifacts(artifacts), []);

  function finish() {
    completeNode(currentNodeIndex);
    router.replace('/adventure');
  }

  function handlePickArtifact(artifact: Artifact) {
    const added = addArtifact(artifact);
    if (!added) {
      Alert.alert('Слоты заполнены', 'У тебя уже 6 артефактов. Продай один в магазине.');
      return;
    }
    finish();
  }

  function handlePickGold() {
    earnGold(goldReward);
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

          {/* A — Artifact */}
          <Pressable style={[styles.optionCard, styles.cardArtifact]} onPress={() => setPhase('artifact')} testID="treasure-artifact">
            <Text style={styles.optionEmoji}>🏺</Text>
            <Text style={styles.optionTitle}>Артефакт</Text>
            <Text style={styles.optionDesc}>Выбери из 3 случайных артефактов</Text>
          </Pressable>

          {/* B — Gold */}
          <Pressable style={[styles.optionCard, styles.cardGold]} onPress={handlePickGold} testID="treasure-gold">
            <Text style={styles.optionEmoji}>💰</Text>
            <Text style={styles.optionTitle}>Золото</Text>
            <Text style={styles.optionGold}>+{goldReward} 💰</Text>
          </Pressable>

          {/* C — Bless */}
          <Pressable style={[styles.optionCard, styles.cardBless]} onPress={() => setPhase('bless')} testID="treasure-bless">
            <Text style={styles.optionEmoji}>✨</Text>
            <Text style={styles.optionTitle}>Благословение</Text>
            <Text style={styles.optionDesc}>{`+${BLESSED_BONUS} 💰 за каждый ход\nблагословлённой фигурой`}</Text>
          </Pressable>

        </View>
      </SafeAreaView>
    );
  }

  // ── ARTIFACT phase ────────────────────────────────────────────────────────────
  if (phase === 'artifact') {
    if (artifactChoices.length === 0) {
      return (
        <SafeAreaView style={styles.safe}>
          <Text style={styles.title}>Пул артефактов пуст</Text>
          <Pressable style={styles.skipBtn} onPress={finish}>
            <Text style={styles.skipText}>Продолжить</Text>
          </Pressable>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Выбери артефакт</Text>
        <Text style={styles.subtitle}>Слотов: {artifacts.length}/6</Text>
        <View style={styles.artifactList} testID="artifact-selection-list">
          {artifactChoices.map(a => (
            <ArtifactCard key={a.id} artifact={a} onPress={handlePickArtifact} testID={`choice-${a.id}`} />
          ))}
        </View>
        <Pressable style={styles.skipBtn} onPress={finish} testID="skip-artifact-btn">
          <Text style={styles.skipText}>Пропустить</Text>
        </Pressable>
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
