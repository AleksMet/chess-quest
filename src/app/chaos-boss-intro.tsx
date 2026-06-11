import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LEVEL_CONFIGS } from '../data/chaosLevelConfig';
import { useChaosModeStore } from '../store/chaosModeStore';

export default function ChaosBossIntroScreen() {
  const router = useRouter();
  const { currentLevel } = useChaosModeStore();
  const bossConfig = LEVEL_CONFIGS[currentLevel - 1].bossConfig;
  const isLevel1 = currentLevel === 1;

  function handleStart() {
    router.push('/chaos-battle');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>{bossConfig.name.toUpperCase()}</Text>

        <Text style={styles.armyLabel}>Армия босса</Text>
        {isLevel1 ? (
          <Text style={styles.armyDesc}>
            Король, 8 пешек, 2 ладьи, конь и 2 ферзя. Каждый ход короля призывает
            нового коня на одну из дальних горизонталей.
          </Text>
        ) : (
          <Text style={styles.armyDesc}>
            Стандартная армия + ♛ Ферзь-Страж 🔵.{'\n'}
            Каждые {bossConfig.evolutionMechanic?.intervalMoves} ходов случайная фигура эволюционирует!
          </Text>
        )}

        {isLevel1 && (
          <Text style={styles.warning}>
            ⚠️ Берегись берсерк-ферзя! Убей его первым.
          </Text>
        )}

        <Text style={styles.taunt}>
          «{bossConfig.intro}»
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.startBtn} onPress={handleStart} testID="chaos-boss-intro-start-btn">
          <Text style={styles.startBtnText}>В БОЙ ⚔️</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0a0505' },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
  crown:   { fontSize: 56 },
  title:   { color: '#ef4444', fontSize: 28, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },

  armyLabel: { color: '#fca5a5', fontSize: 15, fontWeight: '800', marginTop: 12 },
  armyDesc:  { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 21 },

  warning: { color: '#ef4444', fontSize: 14, fontWeight: '800', textAlign: 'center', marginTop: 16, lineHeight: 21 },
  taunt:   { color: '#fbbf24', fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 8, lineHeight: 21 },

  footer:    { paddingHorizontal: 24, paddingVertical: 20 },
  startBtn:  { backgroundColor: '#7f1d1d', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
});
