import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useChaosModeStore } from '../store/chaosModeStore';
import { LEVEL_CONFIGS } from '../data/chaosLevelConfig';

const BATTLE_LABELS = ['Бой 1', 'Бой 2', 'Финальный бой'];

// Шкала звёзд для ХАОСа подобрана под масштаб золота за забег (до 3 боёв за прохождение)
function calcChaosStars(totalScore: number): 1 | 2 | 3 {
  if (totalScore >= 700) return 3;
  if (totalScore >= 350) return 2;
  return 1;
}

export default function ChaosVictoryScreen() {
  const router = useRouter();
  const { totalScore, gold, floorScores, currentLevel, resetRun, setLevel, resetFloor, setGold } = useChaosModeStore();

  const stars = calcChaosStars(totalScore);
  // Армия и золото переходят на следующий уровень — следующий уровень есть, пока для него
  // настроен LEVEL_CONFIGS; стартовое золото уровня добавляется ПОВЕРХ имеющегося
  const nextLevelConfig = LEVEL_CONFIGS[currentLevel];
  const hasNextLevel = !!nextLevelConfig;

  function handleNewRun() {
    resetRun();
    router.replace('/chaos-character-select');
  }

  function handleNextLevel() {
    if (!nextLevelConfig) return;
    if (currentLevel === 1) {
      // Победа над боссом уровня 1: армия распускается, уровень 2 начинается с нуля
      // (король + стартовые пешки персонажа) и со стартовым золотом уровня 2
      resetRun();
      setLevel(2);
      setGold(nextLevelConfig.startingGold);
    } else {
      // Победа над боссом уровня 2+: армия, улучшения и золото переходят дальше — сбрасывается только этаж
      resetFloor();
      setLevel(currentLevel + 1);
    }
    router.replace('/chaos-tower');
  }

  return (
    <LinearGradient colors={['#2a1f3d', '#1a1423']} start={{ x: 0.5, y: 0.3 }} end={{ x: 0.5, y: 1 }} style={styles.gradient}>
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

        {hasNextLevel && (
          <Text style={styles.armyNote}>
            {currentLevel === 1
              ? 'Твоя армия распущена. На следующем уровне всё начнётся заново.'
              : 'Твоя армия переходит на следующий уровень! ⚔️'}
          </Text>
        )}

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
        {hasNextLevel && (
          <Pressable style={styles.nextLevelBtn} onPress={handleNextLevel} testID="chaos-victory-next-level-btn">
            <Text style={styles.newRunBtnText}>➡️ Следующий уровень</Text>
          </Pressable>
        )}
        <Pressable style={styles.newRunBtn} onPress={handleNewRun} testID="chaos-victory-new-run-btn">
          <Text style={styles.newRunBtnText}>🌀 Новый забег</Text>
        </Pressable>
      </View>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe:    { flex: 1 },

  scroll:  { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 6 },
  crown:   { fontSize: 56 },
  title:   { color: '#f1f5f9', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 6 },

  starsRow:  { flexDirection: 'row', gap: 8, marginVertical: 14 },
  star:      { fontSize: 36, color: '#facc15' },
  starDim:   { color: '#334155' },

  totalLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 8 },
  totalScore: { color: '#38bdf8', fontSize: 44, fontWeight: '900' },
  goldTotal:  { color: '#f59e0b', fontSize: 16, fontWeight: '700', marginTop: 6 },
  armyNote:   { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19, paddingHorizontal: 12 },

  breakdown:      { width: '100%', marginTop: 28, backgroundColor: '#1e293b', borderRadius: 16, padding: 16 },
  breakdownLabel: { color: '#a78bfa', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownName:  { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  breakdownScore: { color: '#f59e0b', fontSize: 14, fontWeight: '800' },

  footer:        { paddingHorizontal: 24, paddingVertical: 18, gap: 12 },
  nextLevelBtn:  { backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  newRunBtn:     { backgroundColor: '#7c3aed', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  newRunBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});
