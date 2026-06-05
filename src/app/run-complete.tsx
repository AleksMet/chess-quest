import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { CHAPTER_NAMES } from '../components/map/AdventureMap';

// Gold thresholds for star rating
const STAR_THRESHOLDS = [0, 300, 600] as const;

function calcStars(gold: number): 1 | 2 | 3 {
  if (gold >= STAR_THRESHOLDS[2]) return 3;
  if (gold >= STAR_THRESHOLDS[1]) return 2;
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
  const { artifacts, gold: totalGold, chapterIndex, resetRun } = useRunStore();
  const stars = calcStars(totalGold);
  const chapterName = CHAPTER_NAMES[chapterIndex] ?? 'Приключение';
  const crystalsEarned = Math.max(1, Math.floor(totalGold / 100));
  const nextThreshold: number | null = stars === 1 ? STAR_THRESHOLDS[1] : stars === 2 ? STAR_THRESHOLDS[2] : null;

  function handleNewRun() {
    resetRun();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.crown}>🏆</Text>
        <Text style={styles.title}>Глава пройдена!</Text>
        <Text style={styles.subtitle}>{chapterName} · Глава {chapterIndex + 1}</Text>

        {/* Star rating */}
        <View style={styles.starsRow}>
          {([1, 2, 3] as const).map(s => (
            <View key={s} style={[styles.starWrap, s <= stars ? styles.starActive : styles.starInactive]}>
              <Text style={[styles.starEmoji, s <= stars ? styles.starEmojiActive : styles.starEmojiInactive]}>
                ★
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.starLabel, { color: STAR_LABEL_COLORS[stars] }]}>
          {STAR_LABELS[stars]}
        </Text>

        {nextThreshold !== null && totalGold < nextThreshold && (
          <Text style={styles.nextThresholdHint}>
            Ещё {nextThreshold - totalGold} золота до следующей звезды
          </Text>
        )}

        {/* Stats card */}
        <View style={styles.card}>
          <StatRow icon="💰" label="Золото за забег" value={String(totalGold)} highlight />
          <View style={styles.divider} />
          <StatRow icon="🏺" label="Артефактов собрано" value={String(artifacts.length)} />
          <StatRow icon="💎" label="Кристаллы заработаны" value={`+${crystalsEarned}`} />
        </View>

        {/* Artifacts list */}
        {artifacts.length > 0 && (
          <View style={styles.artifactsSection}>
            <Text style={styles.sectionTitle}>Артефакты в коллекции</Text>
            {artifacts.map(a => (
              <View key={a.id} style={styles.artifactRow}>
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
  safe:                { flex: 1, backgroundColor: '#0f0f1a' },
  scroll:              { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },

  crown:               { fontSize: 64, marginBottom: 8 },
  title:               { color: '#fbbf24', fontSize: 30, fontWeight: '900', textAlign: 'center' },
  subtitle:            { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 24 },

  starsRow:            { flexDirection: 'row', gap: 12, marginBottom: 10 },
  starWrap:            { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  starActive:          { backgroundColor: '#451a03' },
  starInactive:        { backgroundColor: '#1e293b' },
  starEmoji:           { fontSize: 28, fontWeight: '900' },
  starEmojiActive:     { color: '#f59e0b' },
  starEmojiInactive:   { color: '#334155' },

  starLabel:           { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  nextThresholdHint:   { color: '#475569', fontSize: 12, marginBottom: 20 },

  card:                { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, width: '100%', gap: 12, marginBottom: 20, marginTop: 8 },
  divider:             { height: 1, backgroundColor: '#334155' },
  row:                 { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon:             { fontSize: 20, width: 28 },
  rowLabel:            { flex: 1, color: '#94a3b8', fontSize: 14 },
  rowValue:            { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  rowValueHighlight:   { color: '#f59e0b', fontSize: 20, fontWeight: '900' },

  artifactsSection:    { width: '100%', marginBottom: 24 },
  sectionTitle:        { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  artifactRow:         { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6 },
  artifactName:        { color: '#e2e8f0', fontSize: 13 },
  artifactRarity:      { color: '#64748b', fontSize: 11, textTransform: 'capitalize' },

  btn:                 { backgroundColor: '#7c3aed', paddingVertical: 18, paddingHorizontal: 56, borderRadius: 16, marginTop: 4 },
  btnText:             { color: '#fff', fontSize: 18, fontWeight: '800' },
});
