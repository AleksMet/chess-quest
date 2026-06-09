import { useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useChaosModeStore } from '../store/chaosModeStore';
import { CHAOS_TOWER_NODES } from '../data/chaosTowerConfig';

export default function ChaosTowerScreen() {
  const router = useRouter();
  const { currentFloor, gold, totalScore, resetRun } = useChaosModeStore();

  // useFocusEffect вместо useEffect: фоновые экземпляры башни не должны
  // инициировать навигацию (иначе при resetRun() стек старых экранов редиректит в магазин)
  useFocusEffect(
    useCallback(() => {
      if (currentFloor === 0) router.replace('/chaos-shop');
      else if (currentFloor >= CHAOS_TOWER_NODES.length) router.replace('/chaos-victory');
    }, [currentFloor]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (currentFloor === 0 || currentFloor >= CHAOS_TOWER_NODES.length) return null;

  const current = CHAOS_TOWER_NODES[currentFloor];

  function handleForward() {
    router.push(current.route);
  }

  function handleExit() {
    Alert.alert('Выйти из забега?', 'Прогресс будет потерян.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => { resetRun(); router.replace('/chaos-character-select'); } },
    ]);
  }

  // Отображаем сверху вниз: Босс наверху, Магазин 1 внизу — как в спецификации
  const displayNodes = CHAOS_TOWER_NODES
    .map((node, index) => ({ ...node, index }))
    .reverse();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🌀 Башня Хаоса</Text>
          <Text style={styles.subtitle}>{current.icon} {current.label}</Text>
        </View>
        <Text style={styles.gold}>💰 {gold}</Text>
        <Text style={styles.score}>🎯 {totalScore}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="chaos-tower-map">
        {displayNodes.map(({ icon, label, index }) => {
          const isCurrent = index === currentFloor;
          const isDone = index < currentFloor;
          const isBoss = label === 'Босс';

          return (
            <View key={`chaos_node_${index}`} style={styles.row}>
              <View
                style={[
                  styles.node,
                  isCurrent && styles.nodeCurrent,
                  isDone && styles.nodeDone,
                  isBoss && !isCurrent && styles.nodeBoss,
                ]}
                testID={`chaos-node-${index}`}
              >
                <Text style={styles.nodeIcon}>{isDone ? '✅' : icon}</Text>
                <Text style={[styles.nodeLabel, isCurrent && styles.nodeLabelCurrent]}>{label}</Text>
              </View>
              {index < CHAOS_TOWER_NODES.length - 1 && <View style={styles.connector} />}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.exitBtn} onPress={handleExit} testID="chaos-tower-exit-btn">
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <Pressable style={styles.forwardBtn} onPress={handleForward} testID="chaos-tower-forward-btn">
          <Text style={styles.forwardBtnText}>ВПЕРЁД — {current.icon} {current.label}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f172a' },

  header:      {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    gap: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  headerLeft:  { flex: 1 },
  title:       { color: '#f1f5f9', fontSize: 16, fontWeight: '800' },
  subtitle:    { color: '#a78bfa', fontSize: 12, marginTop: 1, fontWeight: '600' },
  gold:        { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  score:       { color: '#38bdf8', fontSize: 15, fontWeight: '700' },

  scroll:  { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },

  row:     { alignItems: 'center' },
  node:    {
    width: 220, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 2, borderColor: '#1e293b',
  },
  nodeCurrent: { borderColor: '#a78bfa', backgroundColor: '#312e5c' },
  nodeDone:    { opacity: 0.6 },
  nodeBoss:    { borderColor: '#451a03', backgroundColor: '#1c0f02' },
  nodeIcon:    { fontSize: 24 },
  nodeLabel:   { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
  nodeLabelCurrent: { color: '#e9d5ff' },

  connector: { width: 3, height: 20, backgroundColor: '#1e293b', marginVertical: 2 },

  footer:      {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 12, borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  exitBtn:     {
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  exitBtnText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  forwardBtn:  {
    flex: 1, backgroundColor: '#7c3aed', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  forwardBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});
