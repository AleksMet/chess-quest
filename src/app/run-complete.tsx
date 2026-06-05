import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';
import { CHAPTER_NAMES } from '../components/map/AdventureMap';

const BASE_SCORE = 500;
const PIECE_BONUS = 50;
const QUEEN_BONUS = 100;
const NO_CHECK_BONUS = 200;

// Star thresholds based on score
const STAR2_THRESHOLD = 800;
const STAR3_THRESHOLD = 1200;

function countPiecesInFen(fen: string | null): { total: number; hasQueen: boolean } {
  if (!fen) return { total: 0, hasQueen: false };
  const board = fen.split(' ')[0];
  const whitePieces = board.replace(/[^A-Z]/g, '');
  const total = whitePieces.replace('K', '').length; // exclude king
  const hasQueen = whitePieces.includes('Q');
  return { total, hasQueen };
}

function calcScore(pieces: number, hasQueen: boolean, noCheck: boolean): number {
  return BASE_SCORE + pieces * PIECE_BONUS + (hasQueen ? QUEEN_BONUS : 0) + (noCheck ? NO_CHECK_BONUS : 0);
}

function calcStars(score: number): 1 | 2 | 3 {
  if (score >= STAR3_THRESHOLD) return 3;
  if (score >= STAR2_THRESHOLD) return 2;
  return 1;
}

const STAR_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Начинающий',
  2: 'Искусный',
  3: 'Мастер',
};

const STAR_LABEL_COLORS: Record<1 | 2 | 3, string> = {
  1: '#b45309',
  2: '#9ca3af',
  3: '#f59e0b',
};

export default function RunCompleteScreen() {
  const router = useRouter();
  const { artifacts, gold: totalGold, chapterIndex, currentFen, kingWasCheckedInRun, resetRun } = useRunStore();
  const { meta, recordBestScore } = useMetaStore();

  const { total: pieceCount, hasQueen } = countPiecesInFen(currentFen);
  const noCheck = !kingWasCheckedInRun;
  const score = calcScore(pieceCount, hasQueen, noCheck);
  const stars = calcStars(score);
  const chapterName = CHAPTER_NAMES[chapterIndex] ?? 'Приключение';
  const crystalsEarned = Math.max(1, Math.floor(totalGold / 100));

  const chapterMeta = meta.chapters.find(c => c.chapterIndex === chapterIndex);
  const prevBest = chapterMeta?.bestScore ?? 0;
  const isNewBest = score > prevBest;

  useEffect(() => {
    recordBestScore(chapterIndex, score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNewRun() {
    resetRun();
    router.replace('/');
  }

  const scoreBreakdown = [
    { label: 'Базовые очки', value: BASE_SCORE, always: true },
    { label: `Фигуры ×${pieceCount}`, value: pieceCount * PIECE_BONUS, condition: pieceCount > 0 },
    { label: 'Ферзь жив', value: QUEEN_BONUS, condition: hasQueen },
    { label: 'Без шаха королю', value: NO_CHECK_BONUS, condition: noCheck },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.crown}>🏆</Text>
        <Text style={styles.title}>Глава пройдена!</Text>
        <Text style={styles.subtitle}>{chapterName} · Глава {chapterIndex + 1}</Text>

        {/* Star rating */}
        <View style={styles.starsRow}>
          {([1, 2, 3] as const).map(s => (
            <View key={`star_${s}`} style={[styles.starWrap, s <= stars ? styles.starActive : styles.starInactive]}>
              <Text style={[styles.starEmoji, s <= stars ? styles.starEmojiActive : styles.starEmojiInactive]}>★</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.starLabel, { color: STAR_LABEL_COLORS[stars] }]}>
          {STAR_LABELS[stars]}
        </Text>

        {/* Score breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ОЧКИ</Text>
          {scoreBreakdown.map((item, i) => (
            (item.always || item.condition) ? (
              <View key={`score_${i}`} style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{item.label}</Text>
                <Text style={[styles.scoreValue, item.condition === false && styles.dimText]}>
                  +{item.value}
                </Text>
              </View>
            ) : (
              <View key={`score_${i}`} style={styles.scoreRow}>
                <Text style={styles.scoreLabelDim}>{item.label.split(' ')[0].replace('×0', '')} —</Text>
                <Text style={styles.scoreMiss}>0</Text>
              </View>
            )
          ))}
          <View style={styles.divider} />
          <View style={styles.scoreRow}>
            <Text style={styles.scoreTotalLabel}>ИТОГО</Text>
            <Text style={styles.scoreTotalValue}>{score}</Text>
          </View>
          {isNewBest && <Text style={styles.newBest}>🎉 Новый рекорд!</Text>}
          {!isNewBest && prevBest > 0 && (
            <Text style={styles.prevBest}>Лучший: {prevBest}</Text>
          )}
        </View>

        {/* Run summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ЗАБЕГ</Text>
          <StatRow icon="💰" label="Золото" value={String(totalGold)} highlight />
          <StatRow icon="🏺" label="Артефактов" value={String(artifacts.length)} />
          <StatRow icon="💎" label="Кристаллов" value={`+${crystalsEarned}`} />
        </View>

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <View style={styles.artifactsSection}>
            <Text style={styles.sectionTitle}>АРТЕФАКТЫ</Text>
            {artifacts.map((a, i) => (
              <View key={`artifact_${a.id}_${i}`} style={styles.artifactRow}>
                <Text style={styles.artifactName}>{a.name}</Text>
                <Text style={styles.artifactRarity}>{a.rarity}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={handleNewRun} testID="new-run-btn">
          <Text style={styles.btnText}>Новый забег</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatRow({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#0f0f1a' },
  scroll:             { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },

  crown:              { fontSize: 64, marginBottom: 8 },
  title:              { color: '#fbbf24', fontSize: 30, fontWeight: '900', textAlign: 'center' },
  subtitle:           { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 24 },

  starsRow:           { flexDirection: 'row', gap: 12, marginBottom: 10 },
  starWrap:           { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  starActive:         { backgroundColor: '#451a03' },
  starInactive:       { backgroundColor: '#1e293b' },
  starEmoji:          { fontSize: 28, fontWeight: '900' },
  starEmojiActive:    { color: '#f59e0b' },
  starEmojiInactive:  { color: '#334155' },
  starLabel:          { fontSize: 16, fontWeight: '700', marginBottom: 20 },

  card:               { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, width: '100%', gap: 10, marginBottom: 16 },
  sectionTitle:       { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  divider:            { height: 1, backgroundColor: '#334155', marginVertical: 4 },

  scoreRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel:         { color: '#94a3b8', fontSize: 14 },
  scoreLabelDim:      { color: '#334155', fontSize: 14 },
  scoreValue:         { color: '#22c55e', fontSize: 14, fontWeight: '700' },
  scoreMiss:          { color: '#334155', fontSize: 14 },
  dimText:            { color: '#475569' },
  scoreTotalLabel:    { color: '#f1f5f9', fontSize: 16, fontWeight: '800' },
  scoreTotalValue:    { color: '#f59e0b', fontSize: 22, fontWeight: '900' },
  newBest:            { color: '#22c55e', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  prevBest:           { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 2 },

  row:                { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon:            { fontSize: 20, width: 28 },
  rowLabel:           { flex: 1, color: '#94a3b8', fontSize: 14 },
  rowValue:           { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  rowValueHighlight:  { color: '#f59e0b', fontSize: 20, fontWeight: '900' },

  artifactsSection:   { width: '100%', marginBottom: 24 },
  artifactRow:        { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6 },
  artifactName:       { color: '#e2e8f0', fontSize: 13 },
  artifactRarity:     { color: '#64748b', fontSize: 11, textTransform: 'capitalize' },

  btn:                { backgroundColor: '#7c3aed', paddingVertical: 18, paddingHorizontal: 56, borderRadius: 16, marginTop: 4 },
  btnText:            { color: '#fff', fontSize: 18, fontWeight: '800' },
});
