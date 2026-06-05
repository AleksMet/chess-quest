import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';

export default function DefeatScreen() {
  const router = useRouter();
  const { chapterIndex, gold, resetRun } = useRunStore();
  const recordRunResult = useMetaStore(s => s.recordRunResult);

  async function handleRetry() {
    await recordRunResult(chapterIndex, false, gold);
    resetRun();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>💀</Text>
        <Text style={styles.title}>Поражение</Text>
        <Text style={styles.subtitle}>Противник оказался сильнее. Не сдавайся!</Text>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardLabel}>Собрано золота за забег</Text>
          <Text style={styles.rewardGold}>💰 {gold}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRetry} testID="defeat-retry-btn">
          <Text style={styles.btnText}>Начать заново</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#1a0000' },
  container:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emoji:       { fontSize: 72, marginBottom: 16 },
  title:       { color: '#ef4444', fontSize: 36, fontWeight: '900', textAlign: 'center' },
  subtitle:    { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  rewardBox:   { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 32, width: '100%' },
  rewardLabel: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  rewardGold:  { color: '#f59e0b', fontSize: 32, fontWeight: '900' },
  btn:         { backgroundColor: '#ef4444', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  btnText:     { color: '#fff', fontSize: 18, fontWeight: '800' },
});
