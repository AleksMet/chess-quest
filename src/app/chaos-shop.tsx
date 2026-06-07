import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChessPieceSVG, type PieceKey } from '../components/chess/ChessPieceSVG';
import { useChaosModeStore, type ChessPiece } from '../store/chaosModeStore';

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

export default function ChaosShopScreen() {
  const router = useRouter();
  const { currentFloor, pieces, gold, spendGold, addPiece, nextFloor } = useChaosModeStore();

  const isSecondShop = currentFloor === 5;
  const title = isSecondShop ? '🏪 Магазин 2' : '🏪 Магазин 1';

  function countOf(piece: ChessPiece): number {
    return pieces.filter(p => p === piece).length;
  }

  function handleBuy(item: ShopItem) {
    if (!spendGold(item.price)) return;
    addPiece(item.piece);
  }

  function handleContinue() {
    nextFloor();
    router.replace('/chaos-tower');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.gold}>💰 {gold}</Text>
      </View>

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

  scroll:  { padding: 16, gap: 10 },

  card:    {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  cardLocked: { opacity: 0.5 },
  cardIcon:   { width: 48, alignItems: 'center', justifyContent: 'center' },
  cardInfo:   { flex: 1 },
  cardName:   { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  cardPrice:  { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  buyBtn:          { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buyBtnDisabled:  { backgroundColor: '#334155' },
  buyBtnText:      { color: '#fff', fontSize: 13, fontWeight: '800' },
  buyBtnTextDisabled: { color: '#64748b' },

  armyBlock: { marginTop: 8, backgroundColor: '#1e293b', borderRadius: 14, padding: 14 },
  armyLabel: { color: '#a78bfa', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  armyRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  armyItem:  { alignItems: 'center', width: 56 },
  armyCount: { color: '#f1f5f9', fontSize: 13, fontWeight: '800', marginTop: 2 },
  armyName:  { color: '#64748b', fontSize: 10, marginTop: 1 },

  footer:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#1e293b', gap: 12,
  },
  balance:        { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  continueBtn:    { flex: 1, backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  continueBtnText:{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
