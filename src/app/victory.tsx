import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';
import { getBossForChapter } from '../data/bosses';
import { calcChapterStars } from '../engine/scoreEngine';

export default function VictoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ isBoss?: string }>();
  const isBoss = params.isBoss === 'true';

  const { chapterIndex, score } = useRunStore();
  const { meta, recordRunResult } = useMetaStore();
  const boss = getBossForChapter(chapterIndex);

  const stars = calcChapterStars(score);
  const chapterMeta = meta.chapters.find(c => c.chapterIndex === chapterIndex);
  const prevBest = chapterMeta?.bestScore ?? 0;
  const isNewBest = isBoss && score > prevBest;

  async function handleContinue() {
    await recordRunResult(chapterIndex, true, score);
    if (isBoss) {
      router.replace('/run-complete');
    } else {
      router.replace('/adventure');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>{isBoss ? '👑' : '⚔️'}</Text>
        <Text style={styles.title}>{isBoss ? 'Босс повержен!' : 'Победа!'}</Text>
        <Text style={styles.subtitle}>
          {isBoss
            ? `Ты одолел ${boss?.name ?? 'босса'}!`
            : 'Противник сдался перед твоим мастерством'}
        </Text>

        {/* Score display */}
        <View style={styles.rewardBox}>
          <Text style={styles.rewardLabel}>Очки за забег</Text>
          <Text style={styles.rewardScore}>🎯 {score}</Text>

          {/* Star rating */}
          <View style={styles.starsRow}>
            {([1, 2, 3] as const).map(s => (
              <Text key={s} style={[styles.star, s <= stars ? styles.starOn : styles.starOff]}>★</Text>
            ))}
          </View>

          {isNewBest && (
            <Text style={styles.newBest}>🎉 Новый рекорд!</Text>
          )}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleContinue} testID="victory-continue-btn">
          <Text style={styles.btnText}>Продолжить</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0f2027' },
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emoji:       { fontSize: 72, marginBottom: 16 },
  title:       { color: '#fbbf24', fontSize: 36, fontWeight: '900', textAlign: 'center' },
  subtitle:    { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  rewardBox:   { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 32, width: '100%', gap: 8 },
  rewardLabel: { color: '#64748b', fontSize: 13 },
  rewardScore: { color: '#f59e0b', fontSize: 36, fontWeight: '900' },
  starsRow:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  star:        { fontSize: 28, fontWeight: '900' },
  starOn:      { color: '#f59e0b' },
  starOff:     { color: '#334155' },
  newBest:     { color: '#22c55e', fontSize: 14, fontWeight: '700', marginTop: 4 },
  btn:         { backgroundColor: '#22c55e', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  btnText:     { color: '#fff', fontSize: 18, fontWeight: '800' },
});
