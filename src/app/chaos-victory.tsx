import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useChaosModeStore } from '../store/chaosModeStore';

const BATTLE_LABELS = ['Бой 1', 'Бой 2', 'Бой 3', 'Финальный бой'];

// Шкала звёзд для ХАОСа подобрана под масштаб золота за забег (до 4 боёв за прохождение)
function calcChaosStars(totalScore: number): 1 | 2 | 3 {
  if (totalScore >= 700) return 3;
  if (totalScore >= 350) return 2;
  return 1;
}

export default function ChaosVictoryScreen() {
  const router = useRouter();
  const { totalScore, gold, floorScores, resetRun } = useChaosModeStore();

  const stars = calcChaosStars(totalScore);

  function handleNewRun() {
    resetRun();
    router.replace('/chaos-tower');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.crown}>🏆</Text>
        <Text style={styles.title}>Башня Хаоса покорена!</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3].map(i => (
            <Text key={i} style={[styles.star, i > stars && styles.starDim]}>★</Text>
          ))}
        </View>

        <Text style={styles.totalLabel}>Итоговый счёт</Text>
        <Text style={styles.totalScore}>{totalScore}</Text>
        <Text style={styles.goldTotal}>💰 Золота на руках: {gold}</Text>

        <View style={styles.breakdown}>
          <Text style={styles.breakdownLabel}>Бои</Text>
          {floorScores.map((score, i) => (
            <View key={`chaos_battle_${i}`} style={styles.breakdownRow}>
              <Text style={styles.breakdownName}>{BATTLE_LABELS[i] ?? `Бой ${i + 1}`}</Text>
              <Text style={styles.breakdownScore}>+{score} 💰</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.newRunBtn} onPress={handleNewRun} testID="chaos-victory-new-run-btn">
          <Text style={styles.newRunBtnText}>🌀 Новый забег</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f172a' },

  scroll:  { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 6 },
  crown:   { fontSize: 56 },
  title:   { color: '#f1f5f9', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 6 },

  starsRow:  { flexDirection: 'row', gap: 8, marginVertical: 14 },
  star:      { fontSize: 36, color: '#facc15' },
  starDim:   { color: '#334155' },

  totalLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 8 },
  totalScore: { color: '#38bdf8', fontSize: 44, fontWeight: '900' },
  goldTotal:  { color: '#f59e0b', fontSize: 16, fontWeight: '700', marginTop: 6 },

  breakdown:      { width: '100%', marginTop: 28, backgroundColor: '#1e293b', borderRadius: 16, padding: 16 },
  breakdownLabel: { color: '#a78bfa', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownName:  { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  breakdownScore: { color: '#f59e0b', fontSize: 14, fontWeight: '800' },

  footer:        { paddingHorizontal: 24, paddingVertical: 18 },
  newRunBtn:     { backgroundColor: '#7c3aed', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  newRunBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});
