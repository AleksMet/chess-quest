import { useMemo } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArtifactCard } from '../components/artifacts/ArtifactCard';
import { useRunStore } from '../store/runStore';
import { ARTIFACTS } from '../data/artifacts';
import type { Artifact } from '../types';

const SHOP_SIZE = 4;

function pickShopInventory(owned: Artifact[]): Artifact[] {
  const ownedIds = new Set(owned.map(a => a.id));
  const pool = ARTIFACTS.filter(a => !ownedIds.has(a.id));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, SHOP_SIZE);
}

export default function ShopScreen() {
  const router = useRouter();
  const { artifacts, gold, spendGold, addArtifact, earnGold, removeArtifact, completeNode, currentNodeIndex } = useRunStore();
  const inventory = useMemo(() => pickShopInventory(artifacts), []);

  function handleBuy(artifact: Artifact) {
    if (artifacts.length >= 6) {
      Alert.alert('Слоты заполнены', 'Продай один артефакт чтобы освободить место.');
      return;
    }
    const ok = spendGold(artifact.shopPrice);
    if (!ok) {
      Alert.alert('Недостаточно золота', `Нужно ${artifact.shopPrice}💰, у тебя ${gold}💰`);
      return;
    }
    addArtifact(artifact);
  }

  function handleSell(artifact: Artifact) {
    removeArtifact(artifact.id);
    earnGold(artifact.sellPrice);
  }

  function handleLeave() {
    completeNode(currentNodeIndex);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Магазин</Text>
        <Text style={styles.gold}>💰 {gold}</Text>
      </View>

      <ScrollView>
        <Text style={styles.section}>Купить</Text>
        <View testID="shop-inventory">
          {inventory.map(a => (
            <View key={a.id}>
              <ArtifactCard artifact={a} testID={`shop-item-${a.id}`} />
              <TouchableOpacity
                style={[styles.buyBtn, gold < a.shopPrice && styles.disabled]}
                onPress={() => handleBuy(a)}
                testID={`buy-${a.id}`}
              >
                <Text style={styles.buyBtnText}>Купить за {a.shopPrice}💰</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {artifacts.length > 0 && (
          <>
            <Text style={styles.section}>Продать</Text>
            {artifacts.map(a => (
              <View key={a.id}>
                <ArtifactCard artifact={a} testID={`owned-${a.id}`} />
                <TouchableOpacity
                  style={styles.sellBtn}
                  onPress={() => handleSell(a)}
                  testID={`sell-${a.id}`}
                >
                  <Text style={styles.sellBtnText}>Продать за {a.sellPrice}💰</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} testID="shop-leave">
        <Text style={styles.leaveBtnText}>Уйти из магазина</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0f172a' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  title:       { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  gold:        { color: '#f59e0b', fontSize: 18, fontWeight: '700' },
  section:     { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 1, marginTop: 16, marginBottom: 8, paddingHorizontal: 16 },
  buyBtn:      { backgroundColor: '#f59e0b', marginHorizontal: 16, marginBottom: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  buyBtnText:  { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  disabled:    { opacity: 0.4 },
  sellBtn:     { backgroundColor: '#334155', marginHorizontal: 16, marginBottom: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  sellBtnText: { color: '#e2e8f0', fontWeight: '700', fontSize: 14 },
  leaveBtn:    { margin: 16, padding: 14, backgroundColor: '#1e293b', borderRadius: 8, alignItems: 'center' },
  leaveBtnText:{ color: '#94a3b8', fontSize: 15 },
});
