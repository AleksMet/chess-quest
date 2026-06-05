import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NodeIcon } from './NodeIcon';
import type { MapNode } from '../../types';

interface Props {
  nodes: MapNode[];
  currentNodeIndex?: number;
}

export const CHAPTER_NAMES = [
  'Лес Пешек',
  'Долина Коней',
  'Храм Диагоналей',
  'Башни Империи',
  'Королевство Ферзя',
  'Чёрный Замок',
];

export function AdventureMap({ nodes }: Props) {
  // Display bottom-to-top: boss at top, starting node at bottom
  const reversed = [...nodes].map((node, originalIdx) => ({ node, originalIdx })).reverse();
  const allDone = nodes.every(n => n.completed);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      testID="adventure-map"
    >
      {allDone && (
        <View style={styles.completeBanner}>
          <Text style={styles.completeBannerText}>🏆 Глава завершена!</Text>
        </View>
      )}

      {reversed.map(({ node, originalIdx }, displayIdx) => {
        const floorNum = nodes.length - displayIdx;
        const isBoss = node.type === 'boss';
        // isCurrent = this is the next node to visit (accessible, not done)
        const isCurrent = node.accessible && !node.completed;

        // connector goes below each displayed node (except the last = floor 1)
        const showConnector = displayIdx < reversed.length - 1;
        // connector turns green when the node below it (lower floor) is completed
        const belowOrigIdx = originalIdx - 1;
        const connectorDone = belowOrigIdx >= 0 && !!nodes[belowOrigIdx]?.completed;

        return (
          <View key={`floor_${originalIdx}`} style={styles.row}>
            <View style={styles.floorRow}>
              {/* Left: floor label */}
              <View style={styles.sideCol}>
                <Text style={[styles.floorText, isBoss && styles.floorTextBoss]}>
                  {isBoss ? '👑' : `F${floorNum}`}
                </Text>
              </View>

              {/* Center: node icon (visual only, no tap) */}
              <NodeIcon
                node={node}
                isCurrent={isCurrent}
              />

              {/* Right: ELO badge */}
              <View style={styles.sideCol}>
                {node.chapterElo > 0 && (
                  <View style={[styles.eloBadge, isBoss && styles.eloBadgeBoss]}>
                    <Text style={[styles.eloText, isBoss && styles.eloTextBoss]}>
                      {node.chapterElo}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {showConnector && (
              <View style={styles.connectorWrap}>
                <View style={[styles.connectorLine, connectorDone && styles.connectorLineDone]} />
                <View style={[styles.connectorMid, connectorDone && styles.connectorMidDone]} />
                <View style={[styles.connectorLine, connectorDone && styles.connectorLineDone]} />
              </View>
            )}
          </View>
        );
      })}

      <Text style={styles.hint}>
        {allDone ? 'Путь пройден!' : 'Нажми ВПЕРЁД чтобы продолжить'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },

  completeBanner:     {
    backgroundColor: '#14532d', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#22c55e',
  },
  completeBannerText: { color: '#86efac', fontSize: 15, fontWeight: '700', textAlign: 'center' },

  row:      { alignItems: 'center', width: '100%' },
  floorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 12 },

  sideCol:      { width: 52, alignItems: 'center' },
  floorText:    { color: '#475569', fontSize: 11, fontWeight: '700' },
  floorTextBoss:{ color: '#f59e0b', fontSize: 13 },

  eloBadge:     { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  eloBadgeBoss: { backgroundColor: '#451a03' },
  eloText:      { color: '#64748b', fontSize: 10, fontWeight: '600' },
  eloTextBoss:  { color: '#f59e0b', fontWeight: '700' },

  connectorWrap:       { flexDirection: 'column', alignItems: 'center', marginVertical: 2 },
  connectorLine:       { width: 3, height: 12, backgroundColor: '#1e293b' },
  connectorLineDone:   { backgroundColor: '#166534' },
  connectorMid:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#334155', marginVertical: 2 },
  connectorMidDone:    { backgroundColor: '#22c55e' },

  hint: { marginTop: 20, color: '#475569', fontSize: 12, textAlign: 'center' },
});
