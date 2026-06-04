import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Artifact, Rarity } from '../../types';

const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#94a3b8',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
  mythic:    '#ef4444',
};

const RARITY_GLOW: Record<Rarity, object> = {
  common:    { shadowColor: '#94a3b8', shadowRadius: 3,  shadowOpacity: 0.4, elevation: 2 },
  rare:      { shadowColor: '#3b82f6', shadowRadius: 8,  shadowOpacity: 0.6, elevation: 5 },
  epic:      { shadowColor: '#a855f7', shadowRadius: 12, shadowOpacity: 0.7, elevation: 7 },
  legendary: { shadowColor: '#f59e0b', shadowRadius: 18, shadowOpacity: 0.8, elevation: 9 },
  mythic:    { shadowColor: '#ef4444', shadowRadius: 22, shadowOpacity: 0.9, elevation: 12 },
};

const RARITY_ICON: Record<Rarity, string> = {
  common:    '◆',
  rare:      '◆◆',
  epic:      '◆◆◆',
  legendary: '★',
  mythic:    '✦',
};

const RARITY_LABEL: Record<Rarity, string> = {
  common:    'Обычный',
  rare:      'Редкий',
  epic:      'Эпический',
  legendary: 'Легендарный',
  mythic:    'Мифический',
};

interface Props {
  artifact: Artifact;
  onPress?: (artifact: Artifact) => void;
  showPrice?: boolean;
  testID?: string;
}

export function ArtifactCard({ artifact, onPress, showPrice = true, testID }: Props) {
  const color = RARITY_COLOR[artifact.rarity];
  const glow = RARITY_GLOW[artifact.rarity];

  return (
    <TouchableOpacity
      testID={testID ?? `artifact-${artifact.id}`}
      style={[styles.card, { borderColor: color }, glow]}
      onPress={() => onPress?.(artifact)}
      activeOpacity={0.82}
    >
      {/* Rarity header */}
      <View style={[styles.rarityBar, { backgroundColor: color + '22' }]}>
        <Text style={[styles.rarityIcon, { color }]}>{RARITY_ICON[artifact.rarity]}</Text>
        <Text style={[styles.rarityLabel, { color }]}>{RARITY_LABEL[artifact.rarity]}</Text>
      </View>

      {/* Name */}
      <Text style={styles.name}>{artifact.name}</Text>

      {/* Description */}
      <Text style={styles.desc}>{artifact.description}</Text>

      {/* Price */}
      {showPrice && (
        <View style={styles.footer}>
          <Text style={styles.price}>💰 {artifact.shopPrice}</Text>
          <Text style={styles.sell}>↩ {artifact.sellPrice}</Text>
        </View>
      )}

      {/* Outer glow ring */}
      <View style={[styles.glowRing, { borderColor: color + '44' }]} pointerEvents="none" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f1923',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 0,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
  },
  rarityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  rarityIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  rarityLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  name: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  desc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  price: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
  },
  sell: {
    color: '#64748b',
    fontSize: 12,
  },
  glowRing: {
    position: 'absolute',
    inset: -1,
    borderRadius: 14,
    borderWidth: 1,
  },
});
