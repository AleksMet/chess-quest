import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { PieceSymbol } from 'chess.js';
import { ChessPieceSVG, type PieceKey } from '../components/chess/ChessPieceSVG';
import { useChaosModeStore } from '../store/chaosModeStore';
import { CHAOS_CHARACTERS } from '../data/chaosCharacters';
import type { ChaosCharacter } from '../types/chaos';

const PIECE_DISPLAY_ORDER: PieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p'];

// Русское склонение слова «ход» по числу: 1 ход, 2-4 хода, 5+ ходов
function turnsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ход';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'хода';
  return 'ходов';
}

function percent(value: number): number {
  return Math.round(value * 100);
}

// Группирует стартовый набор персонажа по типу фигуры — для отображения иконками с количеством
function groupStartingPieces(pieces: PieceSymbol[]): { piece: PieceSymbol; count: number }[] {
  const counts: Partial<Record<PieceSymbol, number>> = {};
  for (const piece of pieces) counts[piece] = (counts[piece] ?? 0) + 1;
  return PIECE_DISPLAY_ORDER.filter(p => counts[p]).map(piece => ({ piece, count: counts[piece]! }));
}

// Пассивки персонажа — выводятся зелёным текстом
function passiveLines(c: ChaosCharacter): string[] {
  const lines: string[] = [];
  if (c.captureGoldBonus > 0) lines.push(`+${c.captureGoldBonus} золота за каждое взятие`);
  if (c.attackUpgradeDiscount > 0) lines.push(`Атакующие улучшения дешевле на ${percent(c.attackUpgradeDiscount)}%`);
  if (c.defenseUpgradeDiscount > 0) lines.push(`Защитные улучшения дешевле на ${percent(c.defenseUpgradeDiscount)}%`);
  if (c.berserkStreakStartBonus !== 30) lines.push(`Серия Берсерка начинается с ${c.berserkStreakStartBonus} золота`);
  if (c.guardTriggerTurns !== 5) lines.push(`Страж срабатывает каждые ${c.guardTriggerTurns} ${turnsWord(c.guardTriggerTurns)}`);
  return lines;
}

// Ограничения персонажа — выводятся красным текстом
function restrictionLines(c: ChaosCharacter): string[] {
  const lines: string[] = [];
  if (c.allowedUpgradeCategories !== 'all') {
    if (!c.allowedUpgradeCategories.includes('attack')) lines.push('Атакующие улучшения недоступны');
    if (!c.allowedUpgradeCategories.includes('defense')) lines.push('Защитные улучшения недоступны');
  }
  if (c.upgradeMarkup > 0) lines.push(`Улучшения дороже на ${percent(c.upgradeMarkup)}%`);
  return lines;
}

export default function ChaosCharacterSelectScreen() {
  const router = useRouter();
  const { guardianUnlocked, loadGuardianUnlocked, setCharacter, resetRun } = useChaosModeStore();

  useEffect(() => {
    loadGuardianUnlocked();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isLocked(character: ChaosCharacter): boolean {
    return character.id === 'guardian' && !guardianUnlocked;
  }

  function handleSelect(character: ChaosCharacter) {
    if (isLocked(character)) return;
    setCharacter(character);
    resetRun();
    router.replace('/chaos-tower');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>🌀 Выбери персонажа</Text>
        <Text style={styles.subtitle}>Стиль игры определяет весь забег по Башне Хаоса</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {CHAOS_CHARACTERS.map(character => {
          const locked = isLocked(character);
          const starting = groupStartingPieces(character.startingPieces);

          return (
            <View key={character.id} style={styles.cardWrap} testID={`chaos-character-${character.id}`}>
              <View style={[styles.card, locked && styles.cardLocked]}>
                <Text style={styles.cardName}>{character.name}</Text>
                <Text style={styles.cardDesc}>{character.description}</Text>

                <View style={styles.startingRow}>
                  {starting.map(({ piece, count }) => (
                    <View key={piece} style={styles.startingItem}>
                      <ChessPieceSVG pieceKey={`w${piece.toUpperCase()}` as PieceKey} size={26} />
                      <Text style={styles.startingCount}>×{count}</Text>
                    </View>
                  ))}
                  <View style={styles.startingGold}>
                    <Text style={styles.startingGoldText}>💰 {character.startingGold}</Text>
                  </View>
                </View>

                {passiveLines(character).map(line => (
                  <Text key={line} style={styles.passiveText}>✓ {line}</Text>
                ))}
                {restrictionLines(character).map(line => (
                  <Text key={line} style={styles.restrictionText}>✗ {line}</Text>
                ))}

                <Pressable
                  style={[styles.selectBtn, locked && styles.selectBtnDisabled]}
                  onPress={() => handleSelect(character)}
                  disabled={locked}
                  testID={`chaos-character-select-${character.id}`}
                >
                  <Text style={[styles.selectBtnText, locked && styles.selectBtnTextDisabled]}>Выбрать</Text>
                </Pressable>
              </View>

              {locked && (
                <View style={styles.lockOverlay} pointerEvents="none">
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.lockText}>Победи босса уровня 1</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f172a' },

  header:  { alignItems: 'center', paddingTop: 24, paddingBottom: 12, paddingHorizontal: 20 },
  title:   { color: '#f1f5f9', fontSize: 22, fontWeight: '900' },
  subtitle:{ color: '#a78bfa', fontSize: 13, fontWeight: '600', marginTop: 6, textAlign: 'center' },

  scroll:  { padding: 16, gap: 16 },

  cardWrap: { position: 'relative' },
  card:    {
    backgroundColor: '#1e293b', borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 18,
    borderWidth: 2, borderColor: '#1e293b',
  },
  cardLocked: { opacity: 0.5 },

  cardName: { color: '#f1f5f9', fontSize: 20, fontWeight: '900' },
  cardDesc: { color: '#94a3b8', fontSize: 13, marginTop: 6, lineHeight: 18 },

  startingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  startingItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  startingCount: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  startingGold:  { marginLeft: 'auto' },
  startingGoldText: { color: '#f59e0b', fontSize: 14, fontWeight: '800' },

  passiveText:     { color: '#22c55e', fontSize: 12, fontWeight: '600', marginTop: 6 },
  restrictionText: { color: '#ef4444', fontSize: 12, fontWeight: '600', marginTop: 6 },

  selectBtn:  {
    marginTop: 14, backgroundColor: '#7c3aed', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  selectBtnDisabled:  { backgroundColor: '#334155' },
  selectBtnText:      { color: '#fff', fontSize: 15, fontWeight: '800' },
  selectBtnTextDisabled: { color: '#64748b' },

  lockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  lockIcon: { fontSize: 36 },
  lockText: { color: '#f1f5f9', fontSize: 13, fontWeight: '800', marginTop: 6, textAlign: 'center' },
});
