import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { MapNode } from '../../types';

interface Props {
  node: MapNode;
  isCurrent: boolean;
  onPress: (node: MapNode) => void;
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
  blitz:        '🌩️',
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
  blitz:        'Молния',
  oracle:       'Оракул',
};

export function NodeIcon({ node, isCurrent, onPress }: Props) {
  const disabled = !node.accessible;

  return (
    <TouchableOpacity
      testID={`node-${node.id}`}
      style={[
        styles.container,
        node.completed && styles.completed,
        isCurrent && styles.current,
        disabled && styles.locked,
      ]}
      onPress={() => !disabled && onPress(node)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{ICON[node.type] ?? '❓'}</Text>
      <Text style={[styles.label, disabled && styles.labelLocked]}>
        {LABEL[node.type] ?? node.type}
      </Text>
      {node.completed && <Text style={styles.check}>✓</Text>}
    </TouchableOpacity>
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
  completed:  { borderColor: '#22c55e', backgroundColor: '#14532d' },
  current:    { borderColor: '#f59e0b', backgroundColor: '#292524' },
  locked:     { opacity: 0.35 },
  icon:       { fontSize: 28 },
  label:      { fontSize: 10, color: '#e2e8f0', marginTop: 4, textAlign: 'center' },
  labelLocked:{ color: '#64748b' },
  check:      { position: 'absolute', top: 4, right: 6, color: '#22c55e', fontSize: 12, fontWeight: 'bold' },
});
