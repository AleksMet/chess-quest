import { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { PieceSymbol } from 'chess.js';
import { useChaosModeStore } from '../store/chaosModeStore';
import { CHAOS_CHARACTERS } from '../data/chaosCharacters';
import type { ChaosCharacter } from '../types/chaos';

const PIECE_DISPLAY_ORDER: PieceSymbol[] = ['k', 'q', 'r', 'b', 'n', 'p'];

const PIECE_UNICODE: Record<PieceSymbol, string> = {
  k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙',
};

type HeroMeta = {
  symbol: string;
  color: string;
  bg: string;
  borderColor: string;
  archetype: string;
  archetypeColor: string;
};

const HERO_META: Record<string, HeroMeta> = {
  merchant: {
    symbol: '♗', color: '#eab308', bg: '#2a1a00',
    borderColor: 'rgba(234,179,8,0.4)', archetype: 'ЭКОНОМИКА', archetypeColor: '#eab308',
  },
  berserk: {
    symbol: '♘', color: '#ef4444', bg: '#2d0808',
    borderColor: 'rgba(239,68,68,0.4)', archetype: 'АГРЕССИЯ', archetypeColor: '#ef4444',
  },
  guardian: {
    symbol: '♖', color: '#3b82f6', bg: '#081428',
    borderColor: 'rgba(59,130,246,0.4)', archetype: 'ЗАЩИТА', archetypeColor: '#3b82f6',
  },
};

const PIECE_DISPLAY_ORDER_FILTERED = PIECE_DISPLAY_ORDER;

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

function groupStartingPieces(pieces: PieceSymbol[]): { piece: PieceSymbol; count: number }[] {
  const counts: Partial<Record<PieceSymbol, number>> = {};
  for (const piece of pieces) counts[piece] = (counts[piece] ?? 0) + 1;
  return PIECE_DISPLAY_ORDER_FILTERED.filter(p => counts[p]).map(piece => ({ piece, count: counts[piece]! }));
}

function passiveLines(c: ChaosCharacter): string[] {
  const lines: string[] = [];
  if (c.captureGoldBonus > 0) lines.push(`+${c.captureGoldBonus} золота за каждое взятие`);
  if (c.startingGold > 100) lines.push(`Начальный капитал ${c.startingGold} золота на каждом уровне`);
  if (c.attackUpgradeDiscount > 0) lines.push(`Атакующие улучшения −${percent(c.attackUpgradeDiscount)}%`);
  if (c.defenseUpgradeDiscount > 0) lines.push(`Защитные улучшения −${percent(c.defenseUpgradeDiscount)}%`);
  if (c.berserkStreakStartBonus !== 30) lines.push(`Серия берсерка начинается с +${c.berserkStreakStartBonus}`);
  if (c.guardTriggerTurns !== 5) lines.push(`Страж срабатывает каждые ${c.guardTriggerTurns} ${turnsWord(c.guardTriggerTurns)}`);
  return lines;
}

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
  const { selectedCharacter, guardianUnlocked, loadGuardianUnlocked, setCharacter, resetRun } = useChaosModeStore();

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
    <View style={styles.root}>
      <LinearGradient
        colors={['#1e0a3c', '#130625', '#0b0418', '#060210']}
        style={styles.bgGradient}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topbar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <View style={styles.topbarCenter}>
            <Text style={styles.topbarTitle}>ВЫБОР ПЕРСОНАЖА</Text>
            <Text style={styles.topbarSub}>стиль игры определяет весь забег</Text>
          </View>
          <View style={styles.topbarSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {CHAOS_CHARACTERS.map(character => {
            const locked = isLocked(character);
            const selected = selectedCharacter?.id === character.id;
            const starting = groupStartingPieces(character.startingPieces);
            const meta = HERO_META[character.id];
            const positives = passiveLines(character);
            const negatives = restrictionLines(character);

            return (
              <View
                key={character.id}
                style={[styles.card, selected && styles.cardSelected]}
                testID={`chaos-character-${character.id}`}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.heroIcon, { backgroundColor: meta.bg, borderColor: meta.borderColor }]}>
                    <Text style={[styles.heroIconText, { color: meta.color }]}>{meta.symbol}</Text>
                  </View>

                  <View style={styles.heroInfo}>
                    <View style={styles.heroNameRow}>
                      <Text style={styles.heroName}>{character.name}</Text>
                      {selected && (
                        <View style={styles.selectedPill}>
                          <Text style={styles.selectedPillText}>✓ Выбран</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.heroArchetype, { color: meta.archetypeColor }]}>
                      {meta.archetype}
                    </Text>
                    <Text style={styles.heroDesc}>{character.description}</Text>
                  </View>
                </View>

                <View style={styles.piecesRow}>
                  {starting.map(({ piece, count }) => (
                    <View key={piece} style={styles.pieceItem}>
                      <Text style={styles.pieceSymbol}>{PIECE_UNICODE[piece]}</Text>
                      <Text style={styles.pieceCount}>×{count}</Text>
                    </View>
                  ))}
                  <View style={styles.goldBadge}>
                    <Text style={styles.goldAmt}>{character.startingGold}</Text>
                    <Text style={styles.goldEmoji}>🪙</Text>
                  </View>
                </View>

                <View style={styles.traits}>
                  {positives.map(line => (
                    <View key={line} style={styles.traitRow}>
                      <Text style={styles.traitPositive}>✓ {line}</Text>
                    </View>
                  ))}
                  {negatives.map(line => (
                    <View key={line} style={styles.traitRow}>
                      <Text style={styles.traitNegative}>✕ {line}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={[styles.selectBtn, locked && styles.selectBtnLocked]}
                  onPress={() => handleSelect(character)}
                  disabled={locked}
                  testID={`chaos-character-select-${character.id}`}
                >
                  {selected ? (
                    <LinearGradient
                      colors={['#c8960c', '#eab308', '#fde68a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      <Text style={[styles.selectBtnText, styles.selectBtnTextGold]}>⚔️  НАЧАТЬ ЗАБЕГ</Text>
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={['#7c3aed', '#a855f7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      <Text style={styles.selectBtnText}>
                        {locked ? '🔒  Победи босса ур.1' : 'Выбрать'}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  safe: { flex: 1 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: 'rgba(8,5,20,0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168,85,247,0.18)',
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#a855f7', fontSize: 16 },
  topbarCenter: { flex: 1, alignItems: 'center' },
  topbarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#eab308',
    letterSpacing: 1,
    textAlign: 'center',
  },
  topbarSub: {
    fontSize: 9,
    color: '#a855f7',
    textAlign: 'center',
    letterSpacing: 0.3,
    opacity: 0.8,
    marginTop: 1,
  },
  topbarSpacer: { width: 28 },

  scroll: { padding: 12 },

  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#1a1035',
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.25)',
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },

  cardHeader: { flexDirection: 'row', gap: 10 },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconText: { fontSize: 26, textAlign: 'center' },

  heroInfo: { flex: 1 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroName: { fontSize: 16, fontWeight: '700', color: '#e5e5e5' },
  selectedPill: {
    backgroundColor: 'rgba(234,179,8,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  selectedPillText: { fontSize: 9, color: '#eab308', fontWeight: '600' },
  heroArchetype: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.7,
    marginTop: 2,
  },
  heroDesc: { fontSize: 10, color: '#b0a8c8', lineHeight: 16, marginTop: 2 },

  piecesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  pieceItem: { flexDirection: 'row', alignItems: 'center' },
  pieceSymbol: { fontSize: 16, color: '#c4bcd8' },
  pieceCount: { fontSize: 10, color: '#c4bcd8', fontWeight: '600' },

  goldBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.28)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goldAmt: { fontSize: 13, fontWeight: '700', color: '#eab308' },
  goldEmoji: { fontSize: 12 },

  traits: { flexDirection: 'column', gap: 4, marginTop: 4 },
  traitRow: { flexDirection: 'row', gap: 5, alignItems: 'flex-start' },
  traitPositive: { fontSize: 10, lineHeight: 14, color: '#4ade80' },
  traitNegative: { fontSize: 10, lineHeight: 14, color: '#f87171' },

  selectBtn: {
    width: '100%',
    height: 42,
    borderRadius: 21,
    marginTop: 8,
    overflow: 'hidden',
  },
  selectBtnLocked: { opacity: 0.5 },
  btnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  selectBtnTextGold: { color: '#1a0e00' },
});
