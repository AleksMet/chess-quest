import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AdventureMap, CHAPTER_NAMES } from '../../components/map/AdventureMap';
import { useRunStore } from '../../store/runStore';
import type { NodeType } from '../../types';

export default function AdventureScreen() {
  const router = useRouter();
  const { nodes, currentNodeIndex, heroId, gold, chapterIndex, advanceToNode, isActive, resetRun } = useRunStore();
  const chapterName = CHAPTER_NAMES[chapterIndex] ?? 'Приключение';

  useEffect(() => {
    if (!isActive) router.replace('/');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isActive) return null;

  const nextNode = nodes.find(n => n.accessible && !n.completed) ?? null;
  const canAdvance = nextNode !== null;

  function handleMenu() {
    Alert.alert(
      'Выйти из забега?',
      'Прогресс потеряется.',
      [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => { resetRun(); router.replace('/'); } },
      ],
    );
  }

  function navigateToNode(type: NodeType) {
    switch (type) {
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
      default:
        break;
    }
  }

  function handleForward() {
    if (!nextNode || !canAdvance) return;
    advanceToNode(nodes.indexOf(nextNode));
    navigateToNode(nextNode.type);
  }

  const nextLabel = nextNode
    ? ({ quick_battle: 'Быстрый бой', ambush: 'Засада', battle: 'Бой', elite: 'Элита', boss: 'БОСС!', treasure: 'Сокровище', shop: 'Магазин', event: 'Событие', puzzle: 'Задача', challenge: 'Испытание', academy: 'Академия', oracle: 'Оракул' } as Record<string, string>)[nextNode.type] ?? 'Вперёд'
    : 'Глава завершена';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.chapterName}>{chapterName}</Text>
          <Text style={styles.hero}>{heroId.replace(/_/g, ' ')}</Text>
        </View>
        <Text style={styles.gold}>💰 {gold}</Text>
      </View>

      {/* Map area — not tappable, use ВПЕРЁД button */}
      <View style={styles.mapArea} testID="map-area">
        <AdventureMap
          nodes={nodes}
          currentNodeIndex={currentNodeIndex}
        />
      </View>

      {/* Footer — ВПЕРЁД + В меню */}
      <View style={styles.footer}>
        <Pressable style={styles.menuBtn} onPress={handleMenu} testID="menu-btn">
          <Text style={styles.menuBtnText}>В меню</Text>
        </Pressable>

        <Pressable
          style={[styles.forwardBtn, !canAdvance && styles.forwardBtnDisabled]}
          onPress={handleForward}
          disabled={!canAdvance}
          testID="forward-btn"
        >
          <Text style={styles.forwardBtnText}>
            {canAdvance ? `ВПЕРЁД — ${nextLabel}` : '✓ Путь пройден'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0f172a' },

  header:      {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    gap: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  headerLeft:  { flex: 1 },
  chapterName: { color: '#f1f5f9', fontSize: 16, fontWeight: '800' },
  hero:        { color: '#64748b', fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  gold:        { color: '#f59e0b', fontSize: 16, fontWeight: '700' },

  mapArea:     { flex: 1 },

  footer:      {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 12, borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  menuBtn:     {
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  menuBtnText: { color: '#64748b', fontSize: 13, fontWeight: '600' },

  forwardBtn:  {
    flex: 1, backgroundColor: '#7c3aed', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  forwardBtnDisabled: { backgroundColor: '#1e293b' },
  forwardBtnText:     { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
