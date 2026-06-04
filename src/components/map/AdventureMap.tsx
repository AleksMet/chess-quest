import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NodeIcon } from './NodeIcon';
import type { MapNode } from '../../types';

interface Props {
  nodes: MapNode[];
  currentNodeIndex: number;
  onNodePress: (node: MapNode) => void;
}

export function AdventureMap({ nodes, currentNodeIndex, onNodePress }: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      testID="adventure-map"
    >
      {nodes.map((node, i) => (
        <View key={node.id} style={styles.row}>
          <NodeIcon
            node={node}
            isCurrent={i === currentNodeIndex}
            onPress={onNodePress}
          />
          {i < nodes.length - 1 && (
            <View style={[styles.connector, node.completed && styles.connectorDone]} />
          )}
        </View>
      ))}
      <Text style={styles.hint}>
        {nodes.every(n => n.completed) ? '🏆 Глава завершена!' : 'Нажми на доступный узел'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:        { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  row:           { alignItems: 'center' },
  connector:     { width: 3, height: 32, backgroundColor: '#334155', marginVertical: 4 },
  connectorDone: { backgroundColor: '#22c55e' },
  hint:          { marginTop: 24, color: '#94a3b8', fontSize: 13 },
});
