import { View, Text, StyleSheet } from 'react-native';
import type { Artifact } from '../../types';

const RARITY_COLOR: Record<string, string> = {
  common:    '#64748b',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
  mythic:    '#ef4444',
};

interface Props {
  artifact?: Artifact;
  index: number;
}

export function ArtifactSlot({ artifact, index }: Props) {
  if (!artifact) {
    return (
      <View style={styles.empty} testID={`slot-empty-${index}`}>
        <Text style={styles.emptyText}>+</Text>
      </View>
    );
  }
  const color = RARITY_COLOR[artifact.rarity] ?? '#64748b';
  return (
    <View style={[styles.filled, { borderColor: color }]} testID={`slot-${artifact.id}`}>
      <Text style={styles.name} numberOfLines={1}>{artifact.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty:     { width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#334155', fontSize: 22, lineHeight: 26 },
  filled:    { width: 60, height: 60, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', padding: 4 },
  name:      { color: '#e2e8f0', fontSize: 9, textAlign: 'center' },
});
