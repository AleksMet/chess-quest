import { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useRunStore } from '../../store/runStore';
import type { NodeType } from '../../types';

const ENEMY_NAMES: Partial<Record<NodeType, string[]>> = {
  quick_battle: ['Гоблинский Патруль', 'Стражи Леса', 'Лесной Отряд', 'Разведчики Тьмы'],
  ambush:       ['Теневые Разбойники', 'Лесные Охотники', 'Ночные Засадники', 'Ловцы Добычи'],
};

const NODE_TITLE: Partial<Record<NodeType, string>> = {
  quick_battle: '⚔️ Быстрый бой',
  ambush:       '🕵️ Засада',
};

const NODE_DESCRIPTION: Partial<Record<NodeType, string>> = {
  quick_battle: 'Победи за 15 ходов\nи получи максимум золота',
  ambush:       'Продержись 10 ходов или поставь мат\n— враг сильнее тебя',
};

const BATTLE_ROUTE: Partial<Record<NodeType, string>> = {
  quick_battle: '/quick-battle',
  ambush:       '/ambush',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function EncounterScreen() {
  const router = useRouter();
  const { nodes, currentNodeIndex, isActive } = useRunStore();

  if (!isActive) { router.replace('/'); return null; }

  const node = nodes[currentNodeIndex];
  const isPreBoss = currentNodeIndex === nodes.length - 2;
  const isQuickBattle = node?.type === 'quick_battle';

  const [enemyName] = useState(() =>
    pickRandom(ENEMY_NAMES[node?.type] ?? ['Противник']),
  );

  const title = NODE_TITLE[node?.type] ?? '⚔️ Бой';
  const description = NODE_DESCRIPTION[node?.type] ?? '';
  const targetRoute = BATTLE_ROUTE[node?.type] ?? '/battle';

  function handleStart() {
    router.replace(targetRoute as Parameters<typeof router.replace>[0]);
  }

  if (isPreBoss && isQuickBattle) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.fullArea} onPress={handleStart} testID="encounter-start-btn">
          <View style={styles.warningBadge}>
            <Text style={styles.warningText}>⚠️ ВАЖНО</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.nodeTitle}>{title}</Text>
            <Text style={styles.enemyName}>Последний перед боссом</Text>
            <View style={styles.divider} />
            <Text style={styles.description}>
              {'Фигуры которые сохранишь\nздесь — пойдут на финальный\nбой с боссом'}
            </Text>
            <Text style={styles.tip}>Береги своих бойцов!</Text>
            <View style={styles.divider} />
            <Text style={styles.tapHint}>[Тапни чтобы начать]</Text>
          </View>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.fullArea} onPress={handleStart} testID="encounter-start-btn">
        <View style={styles.card}>
          <Text style={styles.nodeTitle}>{title}</Text>
          <Text style={styles.enemyName}>{enemyName}</Text>
          <View style={styles.divider} />
          <Text style={styles.description}>{description}</Text>
          <View style={styles.divider} />
          <Text style={styles.tapHint}>[Тапни чтобы начать]</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center' },
  fullArea:     { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: 24 },
  warningBadge: { backgroundColor: '#7f1d1d', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 20 },
  warningText:  { color: '#fca5a5', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  card:         { backgroundColor: '#1e293b', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#334155' },
  nodeTitle:    { color: '#f1f5f9', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  enemyName:    { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
  divider:      { height: 1, backgroundColor: '#334155', width: '100%' },
  description:  { color: '#e2e8f0', fontSize: 15, textAlign: 'center', lineHeight: 26 },
  tip:          { color: '#f59e0b', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  tapHint:      { color: '#475569', fontSize: 14, textAlign: 'center' },
});
