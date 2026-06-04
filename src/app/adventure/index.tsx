import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AdventureMap } from '../../components/map/AdventureMap';
import { useRunStore } from '../../store/runStore';
import type { MapNode } from '../../types';

export default function AdventureScreen() {
  const router = useRouter();
  const { nodes, currentNodeIndex, heroId, gold, advanceToNode, isActive, resetRun } = useRunStore();

  function handleMenu() {
    Alert.alert(
      'Выйти из забега?',
      'Весь прогресс этого забега потеряется.',
      [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => { resetRun(); router.replace('/'); } },
      ],
    );
  }

  useEffect(() => {
    if (!isActive) {
      router.replace('/');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isActive) return null;

  function handleNodePress(node: MapNode) {
    if (!node.accessible || node.completed) return;
    advanceToNode(nodes.indexOf(node));

    switch (node.type) {
      case 'quick_battle':
      case 'ambush':
      case 'blitz':
        router.push('/encounter');
        break;
      case 'battle':
      case 'elite':
      case 'boss':
        router.push('/battle');
        break;
      case 'treasure':
        router.push('/treasure');
        break;
      case 'shop':
        router.push('/shop');
        break;
      case 'event':
        break;
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.hero}>Герой: {heroId}</Text>
        <Text style={styles.gold}>💰 {gold}</Text>
        <Pressable style={styles.menuBtn} onPress={handleMenu} testID="menu-btn">
          <Text style={styles.menuBtnText}>В меню</Text>
        </Pressable>
      </View>
      <AdventureMap
        nodes={nodes}
        currentNodeIndex={currentNodeIndex}
        onNodePress={handleNodePress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0f172a' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  hero:        { flex: 1, color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  gold:        { color: '#f59e0b', fontSize: 16, fontWeight: '700' },
  menuBtn:     { borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  menuBtnText: { color: '#64748b', fontSize: 13 },
});
