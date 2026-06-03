import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Artifact } from '../../types';

const RARITY_COLOR: Record<string, string> = {
  common:    '#64748b',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
  mythic:    '#ef4444',
};

interface Props {
  artifact: Artifact;
  onPress?: (artifact: Artifact) => void;
  testID?: string;
}

export function ArtifactCard({ artifact, onPress, testID }: Props) {
  const color = RARITY_COLOR[artifact.rarity] ?? '#64748b';
  return (
    <TouchableOpacity
      testID={testID ?? `artifact-${artifact.id}`}
      style={[styles.card, { borderColor: color }]}
      onPress={() => onPress?.(artifact)}
      activeOpacity={0.8}
    >
      <Text style={[styles.rarity, { color }]}>{artifact.rarity.toUpperCase()}</Text>
      <Text style={styles.name}>{artifact.name}</Text>
      <Text style={styles.desc}>{artifact.description}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>🏪 {artifact.shopPrice}💰</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:     { backgroundColor: '#1e293b', borderWidth: 2, borderRadius: 12, padding: 14, marginBottom: 10 },
  rarity:   { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  name:     { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  desc:     { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  priceRow: { marginTop: 10, alignItems: 'flex-end' },
  price:    { color: '#f59e0b', fontSize: 13 },
});
