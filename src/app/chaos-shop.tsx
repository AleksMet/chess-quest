import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChessPieceSVG, type PieceKey } from '../components/chess/ChessPieceSVG';
import { useChaosModeStore, pieceInstanceId, type ChessPiece } from '../store/chaosModeStore';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import type { UpgradeType } from '../types/chaos';

interface ShopItem {
  piece: ChessPiece;
  pieceKey: PieceKey;
  name: string;
  price: number;
  max: number;
}

const SHOP_ITEMS: ShopItem[] = [
  { piece: 'p', pieceKey: 'wP', name: 'Пешка', price: 20,  max: 8 },
  { piece: 'n', pieceKey: 'wN', name: 'Конь',  price: 50,  max: 2 },
  { piece: 'b', pieceKey: 'wB', name: 'Слон',  price: 50,  max: 2 },
  { piece: 'r', pieceKey: 'wR', name: 'Ладья', price: 80,  max: 2 },
  { piece: 'q', pieceKey: 'wQ', name: 'Ферзь', price: 150, max: 1 },
];

const ARMY_DISPLAY_ORDER: { piece: ChessPiece; pieceKey: PieceKey; name: string }[] = [
  { piece: 'k', pieceKey: 'wK', name: 'Король' },
  { piece: 'q', pieceKey: 'wQ', name: 'Ферзь' },
  { piece: 'r', pieceKey: 'wR', name: 'Ладья' },
  { piece: 'b', pieceKey: 'wB', name: 'Слон' },
  { piece: 'n', pieceKey: 'wN', name: 'Конь' },
  { piece: 'p', pieceKey: 'wP', name: 'Пешка' },
];

// Имена фигур, которым можно покупать улучшения (король исключён)
const UPGRADABLE_NAMES: Partial<Record<ChessPiece, string>> = {
  q: 'Ферзь',
  r: 'Ладья',
  b: 'Слон',
  n: 'Конь',
  p: 'Пешка',
};

const CATEGORY_ICON: Record<'attack' | 'defense', string> = {
  attack: '🔴',
  defense: '🔵',
};

interface UpgradableInstance {
  id: string;
  pieceType: ChessPiece;
  pieceIndex: number;
  pieceKey: PieceKey;
  label: string;
}

// Перечисляет конкретные экземпляры фигур армии, доступные для улучшения —
// pieceIndex считается по порядку появления типа в массиве (как в buildPlayerBoard)
function buildUpgradableInstances(pieces: ChessPiece[]): UpgradableInstance[] {
  const counts: Partial<Record<ChessPiece, number>> = {};
  const result: UpgradableInstance[] = [];
  for (const type of pieces) {
    const name = UPGRADABLE_NAMES[type];
    if (!name) continue;
    const index = counts[type] ?? 0;
    counts[type] = index + 1;
    result.push({
      id: pieceInstanceId(type, index),
      pieceType: type,
      pieceIndex: index,
      pieceKey: `w${type.toUpperCase()}` as PieceKey,
      label: `${name} ${index + 1}`,
    });
  }
  return result;
}

type ShopTab = 'pieces' | 'upgrades';

export default function ChaosShopScreen() {
  const router = useRouter();
  const {
    currentFloor, pieces, gold, spendGold, addPiece, nextFloor,
    pieceUpgrades, addUpgrade, canAddUpgrade, getPieceUpgradeClass,
  } = useChaosModeStore();

  const [tab, setTab] = useState<ShopTab>('pieces');
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeType | null>(null);

  const isSecondShop = currentFloor === 4;
  const title = isSecondShop ? '🏪 Магазин 2' : '🏪 Магазин 1';

  function countOf(piece: ChessPiece): number {
    return pieces.filter(p => p === piece).length;
  }

  function handleBuy(item: ShopItem) {
    if (!spendGold(item.price)) return;
    addPiece(item.piece);
  }

  function handleSelectUpgrade(type: UpgradeType) {
    setSelectedUpgrade(prev => (prev === type ? null : type));
  }

  // На фигуру можно вешать улучшения только одного класса — атакующие и защитные несовместимы
  function isClassLocked(instance: UpgradableInstance, type: UpgradeType): boolean {
    const lockedClass = getPieceUpgradeClass(instance.id);
    if (!lockedClass) return false;
    const def = UPGRADE_DEFINITIONS.find(d => d.type === type);
    return !!def && def.category !== lockedClass;
  }

  function handleApplyUpgrade(instance: UpgradableInstance) {
    if (!selectedUpgrade) return;
    const def = UPGRADE_DEFINITIONS.find(d => d.type === selectedUpgrade);
    if (!def) return;
    if (!canAddUpgrade(instance.id) || isClassLocked(instance, selectedUpgrade) || gold < def.price) return;
    if (!spendGold(def.price)) return;
    addUpgrade({
      id: `${instance.id}_${def.type}_${pieceUpgrades.length}`,
      pieceType: instance.pieceType,
      pieceIndex: instance.pieceIndex,
      upgradeType: def.type,
      category: def.category,
      turnsOnPosition: 0,
      turnsAlive: 0,
    });
    setSelectedUpgrade(null);
  }

  function handleContinue() {
    nextFloor();
    router.replace('/chaos-tower');
  }

  const upgradableInstances = buildUpgradableInstances(pieces);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.gold}>💰 {gold}</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setTab('pieces')}
          testID="chaos-shop-tab-pieces"
        >
          <Text style={[styles.tabLabel, tab === 'pieces' && styles.tabLabelActive]}>Фигуры</Text>
          {tab === 'pieces' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setTab('upgrades')}
          testID="chaos-shop-tab-upgrades"
        >
          <Text style={[styles.tabLabel, tab === 'upgrades' && styles.tabLabelActive]}>Улучшения</Text>
          {tab === 'upgrades' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {tab === 'pieces' ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {SHOP_ITEMS.map(item => {
            const isQueen = item.piece === 'q';
            const queenLocked = isQueen && !isSecondShop;
            const count = countOf(item.piece);
            const atLimit = count >= item.max;
            const canAfford = gold >= item.price;

            let buttonLabel = 'Купить';
            if (queenLocked) buttonLabel = 'Доступен позже';
            else if (atLimit) buttonLabel = 'Максимум';
            else if (!canAfford) buttonLabel = 'Мало золота';

            const disabled = queenLocked || atLimit || !canAfford;

            return (
              <View key={item.piece} style={[styles.card, queenLocked && styles.cardLocked]} testID={`chaos-shop-item-${item.piece}`}>
                <View style={styles.cardIcon}>
                  <ChessPieceSVG pieceKey={item.pieceKey} size={40} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardPrice}>💰 {item.price} · есть: {count}/{item.max}</Text>
                </View>
                <Pressable
                  style={[styles.buyBtn, disabled && styles.buyBtnDisabled]}
                  onPress={() => handleBuy(item)}
                  disabled={disabled}
                  testID={`chaos-shop-buy-${item.piece}`}
                >
                  <Text style={[styles.buyBtnText, disabled && styles.buyBtnTextDisabled]}>{buttonLabel}</Text>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.armyBlock}>
            <Text style={styles.armyLabel}>Твоя армия</Text>
            <View style={styles.armyRow}>
              {ARMY_DISPLAY_ORDER.map(({ piece, pieceKey, name }) => {
                const count = countOf(piece);
                if (count === 0) return null;
                return (
                  <View key={piece} style={styles.armyItem}>
                    <ChessPieceSVG pieceKey={pieceKey} size={28} />
                    <Text style={styles.armyCount}>×{count}</Text>
                    <Text style={styles.armyName}>{name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.upgradeHint}>
            Улучшение привязывается к конкретной фигуре. Максимум 2 улучшения на одну фигуру.
          </Text>

          {UPGRADE_DEFINITIONS.map(def => {
            const isSelected = selectedUpgrade === def.type;
            const canAfford = gold >= def.price;

            return (
              <Pressable
                key={def.type}
                style={[styles.upgradeCard, isSelected && styles.upgradeCardSelected, !canAfford && styles.cardLocked]}
                onPress={() => handleSelectUpgrade(def.type)}
                testID={`chaos-shop-upgrade-${def.type}`}
              >
                <Text style={styles.categoryIcon}>{CATEGORY_ICON[def.category]}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{def.name}</Text>
                  <Text style={styles.upgradeDesc}>{def.description}</Text>
                  <Text style={styles.cardPrice}>💰 {def.price}</Text>
                </View>
                <View style={[styles.buyBtn, isSelected && styles.buyBtnSelected, !canAfford && styles.buyBtnDisabled]}>
                  <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDisabled]}>
                    {isSelected ? 'Выбрано' : !canAfford ? 'Мало золота' : 'Выбрать'}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {selectedUpgrade && (
            <View style={styles.targetBlock}>
              <Text style={styles.armyLabel}>На какую фигуру наложить?</Text>
              {upgradableInstances.length === 0 ? (
                <Text style={styles.upgradeHint}>В армии нет подходящих фигур — сначала купи их во вкладке «Фигуры»</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.targetRow}>
                  {upgradableInstances.map(instance => {
                    const atLimit = !canAddUpgrade(instance.id);
                    const classLocked = isClassLocked(instance, selectedUpgrade);
                    const locked = atLimit || classLocked;
                    return (
                      <Pressable
                        key={instance.id}
                        style={[styles.targetChip, atLimit && styles.cardLocked, classLocked && styles.classLockedChip]}
                        onPress={() => handleApplyUpgrade(instance)}
                        disabled={locked}
                        testID={`chaos-shop-upgrade-target-${instance.id}`}
                      >
                        <ChessPieceSVG pieceKey={instance.pieceKey} size={26} />
                        <Text style={styles.targetLabel}>{instance.label}</Text>
                        {classLocked
                          ? <Text style={styles.targetLockedLabel}>Только один класс</Text>
                          : atLimit && <Text style={styles.targetLockedLabel}>Максимум улучшений</Text>}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {pieceUpgrades.length > 0 && (
            <View style={styles.armyBlock}>
              <Text style={styles.armyLabel}>Купленные улучшения</Text>
              <View style={styles.armyRow}>
                {pieceUpgrades.map(u => {
                  const def = UPGRADE_DEFINITIONS.find(d => d.type === u.upgradeType);
                  const name = UPGRADABLE_NAMES[u.pieceType] ?? u.pieceType;
                  return (
                    <Text key={u.id} style={styles.ownedUpgrade}>
                      {CATEGORY_ICON[u.category]} {name} {u.pieceIndex + 1} · {def?.name ?? u.upgradeType}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.balance}>💰 Баланс: {gold}</Text>
        <Pressable style={styles.continueBtn} onPress={handleContinue} testID="chaos-shop-continue-btn">
          <Text style={styles.continueBtnText}>В бой ⚔️</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f172a' },

  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  title:   { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  gold:    { color: '#f59e0b', fontSize: 16, fontWeight: '700' },

  tabBar:       { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tabBtn:       { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  tabLabel:     { color: '#64748b', fontSize: 14, fontWeight: '700' },
  tabLabelActive: { color: '#f1f5f9' },
  tabUnderline: { marginTop: 6, height: 3, width: '100%', borderRadius: 2, backgroundColor: '#eab308' },

  scroll:  { padding: 16, gap: 10 },

  card:    {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  cardLocked: { opacity: 0.5 },
  classLockedChip: { opacity: 0.4 },
  cardIcon:   { width: 48, alignItems: 'center', justifyContent: 'center' },
  cardInfo:   { flex: 1 },
  cardName:   { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  cardPrice:  { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  buyBtn:          { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buyBtnSelected:  { backgroundColor: '#eab308' },
  buyBtnDisabled:  { backgroundColor: '#334155' },
  buyBtnText:      { color: '#fff', fontSize: 13, fontWeight: '800' },
  buyBtnTextDisabled: { color: '#64748b' },

  armyBlock: { marginTop: 8, backgroundColor: '#1e293b', borderRadius: 14, padding: 14 },
  armyLabel: { color: '#a78bfa', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  armyRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  armyItem:  { alignItems: 'center', width: 56 },
  armyCount: { color: '#f1f5f9', fontSize: 13, fontWeight: '800', marginTop: 2 },
  armyName:  { color: '#64748b', fontSize: 10, marginTop: 1 },

  upgradeHint:    { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  upgradeCard:    {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 2, borderColor: 'transparent',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  upgradeCardSelected: { borderColor: '#eab308' },
  categoryIcon:   { fontSize: 22 },
  upgradeDesc:    { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  targetBlock:    { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, gap: 8 },
  targetRow:      { gap: 10 },
  targetChip:     { alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, width: 92, gap: 4 },
  targetLabel:    { color: '#f1f5f9', fontSize: 12, fontWeight: '700' },
  targetLockedLabel: { color: '#f87171', fontSize: 9, textAlign: 'center' },

  ownedUpgrade:   { color: '#cbd5e1', fontSize: 12 },

  footer:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#1e293b', gap: 12,
  },
  balance:        { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  continueBtn:    { flex: 1, backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  continueBtnText:{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
