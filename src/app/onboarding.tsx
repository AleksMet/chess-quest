import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMetaStore } from '../store/metaStore';

const STEPS = [
  {
    emoji: '♟',
    title: 'Добро пожаловать в Chess Quest!',
    body: 'Это roguelike-игра, где ты учишься шахматным тактикам и зарабатываешь золото за красивые ходы.',
  },
  {
    emoji: '🗺',
    title: 'Карта приключения',
    body: 'Ты проходишь узлы на карте: битвы, магазины и сокровища. Победи всех противников, чтобы добраться до Босса.',
  },
  {
    emoji: '⚡',
    title: 'Артефакты',
    body: 'Артефакты дают тебе бонусы за особые ходы: вилки, связки, рокировку. Собирай их и усиливай своего героя!',
  },
  {
    emoji: '👑',
    title: 'Босс главы',
    body: 'В конце каждой главы тебя ждёт Босс. Победи его, чтобы открыть следующую главу и новых героев.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useMetaStore(s => s.completeOnboarding);
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function handleNext() {
    if (isLast) {
      completeOnboarding();
      router.replace('/');
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        <TouchableOpacity style={styles.btn} onPress={handleNext} testID="onboarding-next-btn">
          <Text style={styles.btnText}>{isLast ? 'Начать!' : 'Далее'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  dots:      { flexDirection: 'row', marginBottom: 40, gap: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
  dotActive: { backgroundColor: '#f59e0b', width: 24 },
  emoji:     { fontSize: 64, marginBottom: 24 },
  title:     { color: '#f1f5f9', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  body:      { color: '#94a3b8', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 48 },
  btn:       { backgroundColor: '#f59e0b', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  btnText:   { color: '#0f172a', fontSize: 18, fontWeight: '900' },
});
