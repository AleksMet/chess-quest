import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AdventureMap } from '../../components/map/AdventureMap';
import { useRunStore } from '../../store/runStore';
import type { MapNode } from '../../types';

export default function AdventureScreen() {
  const router = useRouter();
  const { nodes, currentNodeIndex, heroId, gold, advanceToNode, isActive } = useRunStore();

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
      case 'battle':
      case 'elite':
      case 'boss':
        router.push('/battle');
        break;
      case 'quick_battle':
        router.push('/quick-battle');
        break;
      case 'puzzle':
        router.push('/puzzle');
        break;
      case 'ambush':
        router.push('/ambush');
        break;
      case 'treasure':
        router.push('/artifact-selection');
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
  safe:   { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  hero:   { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  gold:   { color: '#f59e0b', fontSize: 16, fontWeight: '700' },
});
