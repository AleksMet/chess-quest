import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useChaosModeStore } from '../store/chaosModeStore';

export default function ChaosChoiceScreen() {
  const router = useRouter();
  const { setChosenPath } = useChaosModeStore();
  const [chosen, setChosen] = useState<'elite' | 'normal' | null>(null);

  function handleChoose(path: 'elite' | 'normal') {
    if (chosen) return;
    setChosen(path);
    setChosenPath(path === 'elite' ? 'elite' : 1);
    router.replace('/chaos-battle');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>🔀 Выбор маршрута</Text>
        <Text style={styles.subtitle}>Куда дальше?</Text>
      </View>

      <View style={styles.cards}>
        <Pressable
          style={[styles.card, styles.cardElite]}
          onPress={() => handleChoose('elite')}
          disabled={chosen !== null}
          testID="chaos-choice-elite"
        >
          <Text style={styles.cardIcon}>💀</Text>
          <Text style={styles.cardTitle}>Элита</Text>
          <Text style={styles.cardDesc}>Сложный противник с 4 улучшениями</Text>
          <Text style={styles.cardReward}>Сложнее, но после победы — бесплатный магазин</Text>
          <View style={[styles.cardBtn, styles.cardBtnDanger]}>
            <Text style={styles.cardBtnText}>Рискнуть</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => handleChoose('normal')}
          disabled={chosen !== null}
          testID="chaos-choice-normal"
        >
          <Text style={styles.cardIcon}>⚔️</Text>
          <Text style={styles.cardTitle}>Обычный бой</Text>
          <Text style={styles.cardDesc}>Стандартный противник</Text>
          <View style={styles.cardBtn}>
            <Text style={styles.cardBtnText}>Продолжить</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f172a' },

  header:  { alignItems: 'center', paddingTop: 28, paddingBottom: 8 },
  title:   { color: '#f1f5f9', fontSize: 22, fontWeight: '900' },
  subtitle:{ color: '#a78bfa', fontSize: 13, fontWeight: '600', marginTop: 6 },

  cards:   { flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 16 },

  card:    {
    backgroundColor: '#1e293b', borderRadius: 18,
    paddingVertical: 22, paddingHorizontal: 18, alignItems: 'center',
    borderWidth: 2, borderColor: '#1e293b',
  },
  cardElite: { borderColor: '#ef4444', backgroundColor: '#2a1414' },

  cardIcon:   { fontSize: 40, marginBottom: 8 },
  cardTitle:  { color: '#f1f5f9', fontSize: 17, fontWeight: '800' },
  cardDesc:   { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  cardReward: { color: '#f59e0b', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 8, lineHeight: 17 },

  cardBtn:        { marginTop: 14, backgroundColor: '#334155', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 28 },
  cardBtnDanger:  { backgroundColor: '#7f1d1d' },
  cardBtnText:    { color: '#fff', fontSize: 14, fontWeight: '800' },
});
