import { useRef, useEffect } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import type { MapNode } from '../../types';

interface Props {
  node: MapNode;
  isCurrent: boolean;
}

const ICON: Record<string, string> = {
  battle:       '⚔️',
  quick_battle: '⚡',
  puzzle:       '🧩',
  ambush:       '🕵️',
  elite:        '💀',
  treasure:     '💰',
  shop:         '🏪',
  event:        '📖',
  challenge:    '🎯',
  boss:         '👑',
  academy:      '🎓',
  oracle:       '🔮',
};

const LABEL: Record<string, string> = {
  battle:       'Бой',
  quick_battle: 'Быстрый',
  puzzle:       'Задача',
  ambush:       'Засада',
  elite:        'Элита',
  treasure:     'Сокровище',
  shop:         'Магазин',
  event:        'Событие',
  challenge:    'Испытание',
  boss:         'Босс',
  academy:      'Академия',
  oracle:       'Оракул',
};

export function NodeIcon({ node, isCurrent }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCurrent && !node.completed) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0,  duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      scale.setValue(1);
      return undefined;
    }
  }, [isCurrent, node.completed, scale]);

  return (
    <Animated.View
      style={[
        styles.container,
        node.completed && styles.completed,
        isCurrent && !node.completed && styles.current,
        !node.accessible && styles.locked,
        { transform: [{ scale }] },
      ]}
    >
      <Text style={styles.icon}>{ICON[node.type] ?? '❓'}</Text>
      <Text style={[styles.label, !node.accessible && styles.labelLocked]}>
        {LABEL[node.type] ?? node.type}
      </Text>
      {node.completed && <Text style={styles.check}>✓</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 72,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
  },
  completed:   { borderColor: '#22c55e', backgroundColor: '#14532d' },
  current:     { borderColor: '#f59e0b', backgroundColor: '#292524' },
  locked:      { opacity: 0.35 },
  icon:        { fontSize: 28 },
  label:       { fontSize: 10, color: '#e2e8f0', marginTop: 4, textAlign: 'center' },
  labelLocked: { color: '#64748b' },
  check:       { position: 'absolute', top: 4, right: 6, color: '#22c55e', fontSize: 12, fontWeight: 'bold' },
});
