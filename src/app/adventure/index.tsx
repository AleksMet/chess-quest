import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AdventureMap, CHAPTER_NAMES } from '../../components/map/AdventureMap';
import { useRunStore } from '../../store/runStore';
import type { MapNode } from '../../types';

export default function AdventureScreen() {
  const router = useRouter();
  const { nodes, currentNodeIndex, heroId, gold, chapterIndex, advanceToNode, isActive, resetRun } = useRunStore();
  const chapterName = CHAPTER_NAMES[chapterIndex] ?? 'Приключение';

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
        <View style={styles.headerLeft}>
          <Text style={styles.chapterName}>{chapterName}</Text>
          <Text style={styles.hero}>{heroId.replace('_', ' ')}</Text>
        </View>
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
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerLeft:  { flex: 1 },
  chapterName: { color: '#f1f5f9', fontSize: 16, fontWeight: '800' },
  hero:        { color: '#64748b', fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  gold:        { color: '#f59e0b', fontSize: 16, fontWeight: '700' },
  menuBtn:     { borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  menuBtnText: { color: '#64748b', fontSize: 13 },
});
