import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';
import { FLOOR_DEFS } from '../data/towerConfig';
import { calcChapterStars } from '../engine/scoreEngine';

export default function VictoryScreen() {
  const router = useRouter();
  const { chapterIndex, score, floorTypes, floorScores, resetRun } = useRunStore();
  const { recordRunResult, recordBestScore } = useMetaStore();

  const stars = calcChapterStars(score);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    recordRunResult(chapterIndex, true, score);
    recordBestScore(chapterIndex, score);
  }, [chapterIndex, score, recordRunResult, recordBestScore]);

  function handleNewRun() {
    resetRun();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>Забег завершён!</Text>
        <Text style={styles.subtitle}>Ты прошёл все этажи башни</Text>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardLabel}>Итоговый счёт</Text>
          <Text style={styles.rewardScore}>🎯 {score}</Text>

          <View style={styles.starsRow}>
            {([1, 2, 3] as const).map(s => (
              <Text key={s} style={[styles.star, s <= stars ? styles.starOn : styles.starOff]}>★</Text>
            ))}
          </View>
        </View>

        <View style={styles.breakdownBox}>
          <Text style={styles.breakdownTitle}>По этажам</Text>
          {floorTypes.map((type, i) => {
            const def = FLOOR_DEFS[type];
            return (
              <View key={i} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  {def.icon} Этаж {i + 1} · {def.label}
                </Text>
                <Text style={styles.breakdownScore}>{floorScores[i] ?? 0}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNewRun} testID="victory-new-run-btn">
          <Text style={styles.btnText}>Новый забег</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#0f2027' },
  container:       { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  emoji:           { fontSize: 72, marginBottom: 16 },
  title:           { color: '#fbbf24', fontSize: 36, fontWeight: '900', textAlign: 'center' },
  subtitle:        { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  rewardBox:       { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, width: '100%', gap: 8 },
  rewardLabel:     { color: '#64748b', fontSize: 13 },
  rewardScore:     { color: '#f59e0b', fontSize: 36, fontWeight: '900' },
  starsRow:        { flexDirection: 'row', gap: 8, marginTop: 4 },
  star:            { fontSize: 28, fontWeight: '900' },
  starOn:          { color: '#f59e0b' },
  starOff:         { color: '#334155' },
  breakdownBox:    { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 32, width: '100%', gap: 12 },
  breakdownTitle:  { color: '#64748b', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  breakdownRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownLabel:  { color: '#e2e8f0', fontSize: 15, flex: 1 },
  breakdownScore:  { color: '#fbbf24', fontSize: 17, fontWeight: '800' },
  btn:             { backgroundColor: '#22c55e', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  btnText:         { color: '#fff', fontSize: 18, fontWeight: '800' },
});
