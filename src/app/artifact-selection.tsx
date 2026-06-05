import { useMemo } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArtifactCard } from '../components/artifacts/ArtifactCard';
import { useRunStore } from '../store/runStore';
import { ARTIFACTS } from '../data/artifacts';
import type { Artifact } from '../types';

const SELECTION_COUNT = 3;
const MAX_ARTIFACTS = 6;

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
  const slotsFull = artifacts.length >= MAX_ARTIFACTS;

  function handlePick(artifact: Artifact) {
    addArtifact(artifact);
    completeNode(currentNodeIndex);
    router.replace('/adventure');
  }

  function handleSkip() {
    completeNode(currentNodeIndex);
    router.replace('/adventure');
  }

  if (slotsFull) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Слоты заполнены</Text>
        <Text style={styles.sub}>У тебя уже 6 артефактов.{'\n'}Продай один в магазине чтобы освободить место.</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} testID="skip-artifact-btn">
          <Text style={styles.skipText}>Продолжить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (choices.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Сокровищница пуста</Text>
        <Text style={styles.sub}>Все артефакты уже получены</Text>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Продолжить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Выбери артефакт</Text>
      <Text style={styles.sub}>Слотов занято: {artifacts.length}/6  •  Бесплатно</Text>
      <View style={styles.list} testID="artifact-selection-list">
        {choices.map(a => (
          <ArtifactCard key={a.id} artifact={a} onPress={handlePick} testID={`choice-${a.id}`} />
        ))}
      </View>
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} testID="skip-artifact-btn">
        <Text style={styles.skipText}>Пропустить</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  title:    { color: '#f1f5f9', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  sub:      { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  list:     { flex: 1 },
  skipBtn:  { alignSelf: 'center', marginTop: 12, paddingVertical: 10, paddingHorizontal: 32, borderRadius: 12, backgroundColor: '#1e293b' },
  skipText: { color: '#64748b', fontSize: 14 },
});
