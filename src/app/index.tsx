import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';
import { HEROES } from '../data/heroes';
import { useChapterTheme } from '../contexts/ChapterThemeContext';
import type { Hero, HeroId } from '../types';

export default function MainMenuScreen() {
  const router = useRouter();
  const { theme } = useChapterTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Atmospheric background layers */}
      <View style={[styles.bgLayer1, { backgroundColor: theme.surface + '80' }]} />
      <View style={[styles.bgLayer2, { backgroundColor: theme.accent + '08' }]} />

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={[styles.titleDeco, { color: theme.textMuted }]}>◆ ◆ ◆</Text>
        <Text
          style={[
            styles.title,
            { color: theme.accent, textShadowColor: theme.accent },
          ]}
        >
          Chess Quest
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Глава I · Лес Пешек
        </Text>
        <Text style={[styles.titleDeco, { color: theme.textMuted }]}>◆ ◆ ◆</Text>
      </View>

      {/* Hero section */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>— Выбери героя —</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.heroScroll}
        contentContainerStyle={styles.heroScrollContent}
      >
        {HEROES.map(hero => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={hero.id === selectedHeroId}
            accent={theme.accent}
            surface={theme.surface}
            surfaceRaised={theme.surfaceRaised}
            onPress={() => setSelectedHeroId(hero.id)}
          />
        ))}
      </ScrollView>

      {/* Hero detail */}
      {selectedHero && (
        <View
          style={[
            styles.heroDetail,
            {
              backgroundColor: theme.surface,
              borderColor: theme.accent + '55',
            },
          ]}
          testID="hero-detail"
        >
          <Text style={[styles.heroName, { color: theme.textPrimary }]}>
            {selectedHero.name}
          </Text>
          <Text style={[styles.heroDesc, { color: theme.textSecondary }]}>
            {selectedHero.description}
          </Text>
          <Text style={[styles.heroAura, { color: theme.accent }]}>
            ✦ {selectedHero.auraDescription}
          </Text>
        </View>
      )}

      {/* Start button */}
      <TouchableOpacity
        style={[
          styles.startBtn,
          {
            backgroundColor: theme.buttonBg,
            shadowColor: theme.accent,
          },
        ]}
        onPress={handleStartRun}
        testID="start-run-btn"
        activeOpacity={0.85}
      >
        <Text style={[styles.startBtnText, { color: theme.buttonText }]}>
          ⚔  Начать забег
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

interface HeroCardProps {
  hero: Hero;
  selected: boolean;
  accent: string;
  surface: string;
  surfaceRaised: string;
  onPress: () => void;
}

function HeroCard({ hero, selected, accent, surface, surfaceRaised, onPress }: HeroCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.heroCard,
        {
          backgroundColor: selected ? surfaceRaised : surface,
          borderColor: selected ? accent : surface,
          shadowColor: selected ? accent : 'transparent',
        },
      ]}
      onPress={onPress}
      disabled={!hero.unlocked}
      testID={`hero-${hero.id}`}
      activeOpacity={0.8}
    >
      <Text style={[styles.heroCardName, { color: selected ? accent : '#c8d8c8' }]}>
        {hero.name}
      </Text>
      {!hero.unlocked && <Text style={styles.heroCardLock}>🔒</Text>}
      {selected && <View style={[styles.heroCardDot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bgLayer1: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
  bgLayer2: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 160,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 24,
  },
  titleDeco: {
    fontSize: 12,
    letterSpacing: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: 6,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 3,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionLabel: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 12,
    fontWeight: '600',
  },
  heroScroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  heroScrollContent: {
    paddingHorizontal: 4,
    gap: 10,
  },
  heroCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    minWidth: 110,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
    elevation: 4,
  },
  heroCardName: {
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  heroCardLock: {
    marginTop: 6,
    fontSize: 16,
  },
  heroCardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  heroDetail: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  heroName: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  heroAura: {
    fontSize: 13,
    fontWeight: '600',
  },
  startBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.7,
    elevation: 8,
  },
  startBtnText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
