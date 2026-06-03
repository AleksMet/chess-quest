import { useMemo } from 'react';
import { View, Text, SafeAreaView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArtifactCard } from '../components/artifacts/ArtifactCard';
import { useRunStore } from '../store/runStore';
import { ARTIFACTS } from '../data/artifacts';
import type { Artifact } from '../types';

const SELECTION_COUNT = 3;

function pickThreeArtifacts(owned: Artifact[]): Artifact[] {
  const ownedIds = new Set(owned.map(a => a.id));
  const pool = ARTIFACTS.filter(a => !ownedIds.has(a.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SELECTION_COUNT);
}

export default function ArtifactSelectionScreen() {
  const router = useRouter();
  const { artifacts, addArtifact, currentNodeIndex, completeNode } = useRunStore();

  const choices = useMemo(() => pickThreeArtifacts(artifacts), []);

  function handlePick(artifact: Artifact) {
    const added = addArtifact(artifact);
    if (!added) {
      Alert.alert(
        'Слоты заполнены',
        'У тебя уже 6 артефактов. Продай один в магазине.',
        [{ text: 'OK' }],
      );
      return;
    }
    completeNode(currentNodeIndex);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Выбери артефакт</Text>
      <Text style={styles.sub}>Слотов занято: {artifacts.length}/6</Text>
      <View style={styles.list} testID="artifact-selection-list">
        {choices.map(a => (
          <ArtifactCard key={a.id} artifact={a} onPress={handlePick} testID={`choice-${a.id}`} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  sub:   { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  list:  { flex: 1 },
});
