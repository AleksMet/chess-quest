import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';

export default function VictoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gold?: string; isBoss?: string }>();
  const goldEarned = Number(params.gold ?? 0);
  const isBoss = params.isBoss === 'true';

  const { chapterIndex, resetRun } = useRunStore();
  const recordRunResult = useMetaStore(s => s.recordRunResult);

  async function handleContinue() {
    await recordRunResult(chapterIndex, true, goldEarned);
    if (isBoss) {
      resetRun();
      router.replace('/');
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
            ? 'Ты одолел Гоблинского Короля!'
            : 'Противник сдался перед твоим мастерством'}
        </Text>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardLabel}>Заработано золота</Text>
          <Text style={styles.rewardGold}>💰 {goldEarned}</Text>
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
  rewardBox:   { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 32, width: '100%' },
  rewardLabel: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  rewardGold:  { color: '#f59e0b', fontSize: 32, fontWeight: '900' },
  btn:         { backgroundColor: '#22c55e', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  btnText:     { color: '#fff', fontSize: 18, fontWeight: '800' },
});
