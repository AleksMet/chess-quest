import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';
import { HEROES } from '../data/heroes';
import type { Hero, HeroId } from '../types';

export default function MainMenuScreen() {
  const router = useRouter();
  const startRun = useRunStore(s => s.startRun);
  const { isLoaded, loadMeta } = useMetaStore();
  const [selectedHeroId, setSelectedHeroId] = useState<HeroId>('timmy_pawn');

  useEffect(() => {
    loadMeta().then(() => {
      if (!useMetaStore.getState().meta.onboardingCompleted) {
        router.replace('/onboarding');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedHero = HEROES.find(h => h.id === selectedHeroId) ?? HEROES[0];

  function handleStartRun() {
    startRun(selectedHeroId);
    router.push('/adventure');
  }

  if (!isLoaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>♟ Chess Quest</Text>
      <Text style={styles.sub}>Roguelike шахматное приключение</Text>

      <Text style={styles.sectionTitle}>Выбери героя</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heroRow}>
        {HEROES.map(hero => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={hero.id === selectedHeroId}
            onPress={() => setSelectedHeroId(hero.id)}
          />
        ))}
      </ScrollView>

      {selectedHero && (
        <View style={styles.heroDetail} testID="hero-detail">
          <Text style={styles.heroName}>{selectedHero.name}</Text>
          <Text style={styles.heroDesc}>{selectedHero.description}</Text>
          <Text style={styles.heroAura}>✨ {selectedHero.auraDescription}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.startBtn} onPress={handleStartRun} testID="start-run-btn">
        <Text style={styles.startBtnText}>⚔️ Начать забег</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function HeroCard({ hero, selected, onPress }: { hero: Hero; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.heroCard, selected && styles.heroCardSelected, !hero.unlocked && styles.heroCardLocked]}
      onPress={onPress}
      disabled={!hero.unlocked}
      testID={`hero-${hero.id}`}
    >
      <Text style={styles.heroCardName}>{hero.name}</Text>
      {!hero.unlocked && <Text style={styles.heroCardLock}>🔒</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 16 },
  title:           { color: '#f1f5f9', fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: 40 },
  sub:             { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  sectionTitle:    { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  heroRow:         { flexGrow: 0, marginBottom: 16 },
  heroCard:        { backgroundColor: '#1e293b', borderRadius: 10, padding: 16, marginRight: 10, borderWidth: 2, borderColor: '#334155', minWidth: 120 },
  heroCardSelected:{ borderColor: '#f59e0b', backgroundColor: '#292524' },
  heroCardLocked:  { opacity: 0.4 },
  heroCardName:    { color: '#e2e8f0', fontWeight: '700', fontSize: 14 },
  heroCardLock:    { marginTop: 4, fontSize: 16 },
  heroDetail:      { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 24 },
  heroName:        { color: '#f1f5f9', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  heroDesc:        { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  heroAura:        { color: '#fbbf24', fontSize: 13 },
  startBtn:        { backgroundColor: '#f59e0b', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 'auto', marginBottom: 16 },
  startBtnText:    { color: '#0f172a', fontSize: 18, fontWeight: '900' },
});
