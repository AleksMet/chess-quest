import { useState } from 'react';
import { Alert, View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChessPieceSVG, type PieceKey } from '../components/chess/ChessPieceSVG';
import { useChaosModeStore, pieceInstanceId, type ChessPiece } from '../store/chaosModeStore';
import { getTowerNodes } from '../data/chaosTowerConfig';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import type { ChaosUpgradeDefinition, UpgradeType } from '../types/chaos';

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
    currentFloor, currentLevel, pieces, gold, spendGold, addPiece, nextFloor,
    pieceUpgrades, addUpgrade, canAddUpgrade, hasUpgradeType, getPieceUpgradeClass,
    getUpgradePrice, isUpgradeAvailable,
  } = useChaosModeStore();

  const [tab, setTab] = useState<ShopTab>('pieces');
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeType | null>(null);

  // Магазин перед боссом — всегда «Магазин 2» (ферзь и все улучшения доступны),
  // независимо от того, на каком этаже башни уровня он расположен
  const towerNodes = getTowerNodes(currentLevel);
  const shopFloors = towerNodes.reduce<number[]>((acc, n, i) => (n.type === 'shop' ? [...acc, i] : acc), []);
  const isSecondShop = currentFloor === shopFloors[shopFloors.length - 1];
  const title = isSecondShop ? '🏪 Магазин 2' : '🏪 Магазин 1';

  function countOf(piece: ChessPiece): number {
    return pieces.filter(p => p === piece).length;
  }

  function handleBuy(item: ShopItem) {
    if (!spendGold(item.price)) return;
    addPiece(item.piece);
  }

  function handleSelectUpgrade(def: ChaosUpgradeDefinition) {
    if (!isUpgradeAvailable(def.category)) return;
    setSelectedUpgrade(prev => (prev === def.type ? null : def.type));
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
    if (hasUpgradeType(instance.id, selectedUpgrade)) {
      Alert.alert('Это улучшение уже применено', 'Выбери другую фигуру или другое улучшение.');
      return;
    }
    const price = getUpgradePrice(def.price, def.category);
    if (!canAddUpgrade(instance.id) || isClassLocked(instance, selectedUpgrade) || gold < price) return;
    if (!spendGold(price)) return;
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

  function handleExitToMenu() {
    Alert.alert(
      'Выйти в главное меню?',
      'Текущий прогресс забега будет сохранён.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', onPress: () => router.replace('/') },
      ]
    );
  }

  const upgradableInstances = buildUpgradableInstances(pieces);

  return (
    <LinearGradient colors={['#2a1f3d', '#1a1423']} start={{ x: 0.5, y: 0.3 }} end={{ x: 0.5, y: 1 }} style={styles.gradient}>
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
            const available = isUpgradeAvailable(def.category);
            const price = getUpgradePrice(def.price, def.category);
            const hasPriceChange = price !== def.price;
            const canAfford = gold >= price;

            let buttonLabel = 'Выбрать';
            if (!available) buttonLabel = 'Недоступно для персонажа';
            else if (isSelected) buttonLabel = 'Выбрано';
            else if (!canAfford) buttonLabel = 'Мало золота';

            const cardDisabled = !available || !canAfford;

            return (
              <Pressable
                key={def.type}
                style={[styles.upgradeCard, isSelected && styles.upgradeCardSelected, cardDisabled && styles.cardLocked]}
                onPress={() => handleSelectUpgrade(def)}
                disabled={!available}
                testID={`chaos-shop-upgrade-${def.type}`}
              >
                <Text style={styles.categoryIcon}>{CATEGORY_ICON[def.category]}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{def.name}</Text>
                  <Text style={styles.upgradeDesc}>{def.description}</Text>
                  <View style={styles.priceRow}>
                    {hasPriceChange && <Text style={styles.priceOriginal}>💰 {def.price}</Text>}
                    <Text style={[styles.cardPrice, hasPriceChange && styles.priceAccent]}>💰 {price}</Text>
                  </View>
                </View>
                <View style={[styles.buyBtn, isSelected && styles.buyBtnSelected, cardDisabled && styles.buyBtnDisabled]}>
                  <Text style={[styles.buyBtnText, cardDisabled && styles.buyBtnTextDisabled]}>
                    {buttonLabel}
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
                    const alreadyApplied = hasUpgradeType(instance.id, selectedUpgrade);
                    const locked = atLimit || classLocked || alreadyApplied;
                    return (
                      <Pressable
                        key={instance.id}
                        style={[styles.targetChip, atLimit && styles.cardLocked, classLocked && styles.classLockedChip, alreadyApplied && styles.classLockedChip]}
                        onPress={() => handleApplyUpgrade(instance)}
                        disabled={locked}
                        testID={`chaos-shop-upgrade-target-${instance.id}`}
                      >
                        <ChessPieceSVG pieceKey={instance.pieceKey} size={26} />
                        <Text style={styles.targetLabel}>{instance.label}</Text>
                        {alreadyApplied
                          ? <Text style={styles.targetLockedLabel}>Уже применено</Text>
                          : classLocked
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
        <View style={styles.footerRow}>
          <Text style={styles.balance}>💰 Баланс: {gold}</Text>
          <Pressable style={styles.continueBtn} onPress={handleContinue} testID="chaos-shop-continue-btn">
            <Text style={styles.continueBtnText}>В бой ⚔️</Text>
          </Pressable>
        </View>
        <Pressable style={styles.exitMenuBtn} onPress={handleExitToMenu} testID="chaos-shop-exit-menu-btn">
          <Text style={styles.exitMenuBtnText}>✕ Выйти в главное меню</Text>
        </Pressable>
      </View>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe:    { flex: 1 },

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
  cardInfo:   { flex: 1, minWidth: 100 },
  cardName:   { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  cardPrice:  { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  priceRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  priceOriginal: { color: '#64748b', fontSize: 12, textDecorationLine: 'line-through' },
  priceAccent:   { color: '#eab308', fontWeight: '800' },

  buyBtn:          { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexShrink: 1 },
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
    flexDirection: 'column',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  footerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  balance:        { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  continueBtn:    { flex: 1, backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  continueBtnText:{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  exitMenuBtn:    {
    width: '100%', height: 40, marginTop: 8,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  exitMenuBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '600' },
});
