import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useChaosModeStore, type ChaosArtifact } from '../store/chaosModeStore';
import { CHAOS_FORK_BONUS, CHAOS_TREASURY_GOLD, CHAOS_BLITZ_MOVE_LIMIT } from '../engine/chaosBattle';

type TreasureKey = ChaosArtifact | 'treasury';

interface TreasureOption {
  key: TreasureKey;
  icon: string;
  title: string;
  description: string;
}

const TREASURE_OPTIONS: TreasureOption[] = [
  {
    key: 'fork_master',
    icon: '♞',
    title: 'Вилка Каспарова',
    description: `Каждая вилка конём приносит +${CHAOS_FORK_BONUS} золота`,
  },
  {
    key: 'treasury',
    icon: '💰',
    title: 'Казна',
    description: `Мгновенно получи +${CHAOS_TREASURY_GOLD} золота`,
  },
  {
    key: 'blitz_master',
    icon: '⚡',
    title: 'Блиц-мастер',
    description: `Победа за ${CHAOS_BLITZ_MOVE_LIMIT} ходов или меньше удваивает золото за бой`,
  },
];

export default function ChaosTreasureScreen() {
  const router = useRouter();
  const { addArtifact, addGold, nextFloor } = useChaosModeStore();
  const [chosen, setChosen] = useState<TreasureKey | null>(null);

  function handleChoose(option: TreasureOption) {
    if (chosen) return;
    setChosen(option.key);

    if (option.key === 'treasury') addGold(CHAOS_TREASURY_GOLD);
    else addArtifact(option.key);

    setTimeout(() => {
      nextFloor();
      router.replace('/chaos-tower');
    }, 1000);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>💎 Сокровище</Text>
        <Text style={styles.subtitle}>Выбери одну награду</Text>
      </View>

      <View style={styles.cards}>
        {TREASURE_OPTIONS.map(option => {
          const isChosen = chosen === option.key;
          const isDisabled = chosen !== null && !isChosen;

          return (
            <Pressable
              key={option.key}
              style={[styles.card, isChosen && styles.cardChosen, isDisabled && styles.cardDisabled]}
              onPress={() => handleChoose(option)}
              disabled={chosen !== null}
              testID={`chaos-treasure-${option.key}`}
            >
              <Text style={styles.cardIcon}>{option.icon}</Text>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDesc}>{option.description}</Text>
              {isChosen && <Text style={styles.cardChosenLabel}>✓ Выбрано</Text>}
            </Pressable>
          );
        })}
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
  cardChosen:   { borderColor: '#22c55e', backgroundColor: '#14301f' },
  cardDisabled: { opacity: 0.4 },
  cardIcon:     { fontSize: 40, marginBottom: 8 },
  cardTitle:    { color: '#f1f5f9', fontSize: 17, fontWeight: '800' },
  cardDesc:     { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  cardChosenLabel: { color: '#22c55e', fontSize: 13, fontWeight: '800', marginTop: 10 },
});
