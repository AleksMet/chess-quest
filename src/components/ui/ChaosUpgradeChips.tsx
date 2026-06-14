import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PieceSymbol } from 'chess.js';
import { LinearGradient } from 'expo-linear-gradient';
import { ChessPiece } from '../chess/ChessPiece';
import type { PieceKey } from '../chess/ChessPieceSVG';
import type { EffectCategory } from '../../types/pieceEffects';
import { PIECE_DISPLAY_NAME } from '../../data/pieceNames';

// HUD эффектов в бою режима ХАОС: ряд чипов (группировка по типу эффекта,
// счётчик при нескольких фигурах) + модалка с подробностями по нажатию на чип.
// Универсальна для атакующих/защитных улучшений и дебаффов (см. EffectCategory).

export interface EffectGroupPiece {
  pieceType: PieceSymbol;
  count: number;
}

export interface EffectGroup {
  effectType: string;
  category: EffectCategory;
  iconPieceKey: PieceKey;
  totalCount: number;
  pieces: EffectGroupPiece[];
  label: string;
  description: string;
}

const ATTACK_BORDER = '#ef4444';
const ATTACK_BG: [string, string] = ['#2d0808', '#1a0404'];
const ATTACK_SHADOW = 'rgba(239,68,68,0.45)';
const DEFENSE_BORDER = '#3b82f6';
const DEFENSE_BG: [string, string] = ['#080d2d', '#04081a'];
const DEFENSE_SHADOW = 'rgba(59,130,246,0.45)';
const DEBUFF_BORDER = '#9333EA';
const DEBUFF_BG: [string, string] = ['#1a0d2d', '#0d0619'];
const DEBUFF_SHADOW = 'rgba(147,51,234,0.45)';

const CATEGORY_STYLE: Record<EffectCategory, { border: string; bg: [string, string]; shadow: string }> = {
  attack:  { border: ATTACK_BORDER, bg: ATTACK_BG, shadow: ATTACK_SHADOW },
  defense: { border: DEFENSE_BORDER, bg: DEFENSE_BG, shadow: DEFENSE_SHADOW },
  debuff:  { border: DEBUFF_BORDER, bg: DEBUFF_BG, shadow: DEBUFF_SHADOW },
};

const CATEGORY_TYPE_LABEL: Record<EffectCategory, string> = {
  attack:  '⚔️ Атакующий',
  defense: '🛡 Защитный',
  debuff:  '💀 Дебафф',
};

interface UpgradeChipsRowProps {
  label: string;
  groups: EffectGroup[];
  onPressGroup: (group: EffectGroup) => void;
  extra?: React.ReactNode;
  testID?: string;
}

export function UpgradeChipsRow({ label, groups, onPressGroup, extra, testID }: UpgradeChipsRowProps) {
  if (groups.length === 0 && !extra) return null;
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.chips}>
        {groups.map(group => {
          const style = CATEGORY_STYLE[group.category];
          return (
            <Pressable
              key={group.effectType}
              onPress={() => onPressGroup(group)}
              testID={`upgrade-chip-${group.effectType}`}
            >
              <LinearGradient
                colors={style.bg}
                style={[styles.chip, { borderColor: style.border, shadowColor: style.shadow }]}
              >
                <ChessPiece pieceKey={group.iconPieceKey} size={28} />
                {group.totalCount > 1 && (
                  <View style={[styles.counter, { backgroundColor: style.border }]}>
                    <Text style={styles.counterText}>{group.totalCount}</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>
      {extra}
    </View>
  );
}

interface UpgradeDetailModalProps {
  group: EffectGroup | null;
  isAI: boolean;
  onClose: () => void;
}

export function UpgradeDetailModal({ group, isAI, onClose }: UpgradeDetailModalProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!group) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [group, opacity]);

  if (!group) return null;

  const style = CATEGORY_STYLE[group.category];
  const isDebuff = group.category === 'debuff';

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="upgrade-modal-backdrop" />
      <View style={[styles.card, { borderColor: style.border }, isDebuff && styles.cardDebuff]}>
        <Pressable style={styles.closeBtn} onPress={onClose} testID="upgrade-modal-close">
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <LinearGradient colors={style.bg} style={[styles.bigIcon, { borderColor: style.border }]}>
          <ChessPiece pieceKey={group.iconPieceKey} size={64} />
        </LinearGradient>
        <Text style={styles.modalSubtitle}>{isAI ? 'AI · Эффект' : 'Эффект'}</Text>
        <Text style={styles.modalTitle}>{group.label}</Text>
        <Text style={[styles.modalType, { color: style.border }]}>
          {CATEGORY_TYPE_LABEL[group.category]}
        </Text>
        <View style={styles.piecesList}>
          {group.pieces.map(p => (
            <Text key={p.pieceType} style={styles.pieceLine}>
              {PIECE_DISPLAY_NAME[p.pieceType]}{p.count > 1 ? ` ×${p.count}` : ''}
            </Text>
          ))}
        </View>
        <Text style={styles.modalDescription}>{group.description}</Text>
        {isDebuff && (
          <View style={styles.debuffBanner}>
            <Text style={styles.debuffBannerText}>⚠️ Негативный эффект</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 8, minHeight: 48 },
  rowLabel:   { color: '#64748b', fontSize: 10, fontWeight: '700' },
  chips:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 },
  chip: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  counter: {
    position: 'absolute', top: -4, right: -4,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  counterText: { color: '#fff', fontSize: 8, fontFamily: 'monospace', fontWeight: '700' },

  overlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  card: {
    width: 280, borderRadius: 16, borderWidth: 1,
    backgroundColor: '#15151f', padding: 20, alignItems: 'center', gap: 6,
  },
  cardDebuff: {
    borderColor: 'rgba(147,51,234,0.5)',
    shadowColor: '#9333EA', shadowOpacity: 0.25, shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 }, elevation: 10,
  },
  closeBtn:     { position: 'absolute', top: 10, right: 10, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#94a3b8', fontSize: 16, fontWeight: '700' },
  bigIcon: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  modalSubtitle:   { color: '#64748b', fontSize: 11, fontWeight: '700' },
  modalTitle:      { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  modalType:       { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  piecesList:      { alignItems: 'center', marginBottom: 4 },
  pieceLine:       { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  modalDescription: { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  debuffBanner: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  debuffBannerText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
});
