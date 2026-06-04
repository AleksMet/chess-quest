import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRunStore } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';

export default function RunCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gold?: string }>();
  const battleGold = Number(params.gold ?? 0);

  const { artifacts, gold: totalGold, resetRun } = useRunStore();
  const { meta } = useMetaStore();

  const crystalsEarned = Math.max(1, Math.floor(battleGold / 100));

  function handleNewRun() {
    resetRun();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>Забег завершён!</Text>
        <Text style={styles.subtitle}>Глава пройдена. Твой прогресс сохранён.</Text>

        <View style={styles.card}>
          <Row icon="💰" label="Золото за забег" value={String(totalGold)} />
          <Row icon="🏺" label="Артефактов собрано" value={String(artifacts.length)} />
          <Row icon="💎" label="Кристаллов получено" value={`+${crystalsEarned}`} highlight />
          <Row icon="💎" label="Кристаллов всего" value={String(meta.crystals)} />
        </View>

        {artifacts.length > 0 && (
          <View style={styles.artifactsSection}>
            <Text style={styles.sectionTitle}>Артефакты в коллекции</Text>
            {artifacts.map(a => (
              <View key={a.id} style={styles.artifactRow}>
                <Text style={styles.artifactName}>{a.name}</Text>
                <Text style={styles.artifactRarity}>{a.rarity}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={handleNewRun} testID="new-run-btn">
          <Text style={styles.btnText}>Новый забег</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:                 { flex: 1, backgroundColor: '#0f0f1a' },
  scroll:               { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  crown:                { fontSize: 72, marginBottom: 12 },
  title:                { color: '#fbbf24', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  subtitle:             { color: '#94a3b8', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  card:                 { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, width: '100%', gap: 14, marginBottom: 20 },
  row:                  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon:              { fontSize: 22, width: 32 },
  rowLabel:             { flex: 1, color: '#94a3b8', fontSize: 15 },
  rowValue:             { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  rowValueHighlight:    { color: '#a78bfa', fontSize: 20, fontWeight: '900' },
  artifactsSection:     { width: '100%', marginBottom: 24 },
  sectionTitle:         { color: '#64748b', fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  artifactRow:          { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6 },
  artifactName:         { color: '#e2e8f0', fontSize: 14 },
  artifactRarity:       { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  btn:                  { backgroundColor: '#7c3aed', paddingVertical: 18, paddingHorizontal: 56, borderRadius: 16, marginTop: 4 },
  btnText:              { color: '#fff', fontSize: 18, fontWeight: '800' },
});
