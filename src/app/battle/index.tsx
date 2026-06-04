import { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BattleScreen } from '../../components/battle/BattleScreen';
import { useRunStore } from '../../store/runStore';
import { HEROES } from '../../data/heroes';
import { getBossForChapter } from '../../data/bosses';
import { eloToSkillLevel } from '../../engine/stockfish';

type DialogPhase = 'before' | 'battle' | 'after';

export default function BattlePage() {
  const router = useRouter();
  const { heroId, artifacts, nodes, currentNodeIndex, chapterIndex, earnGold, completeNode, isActive } =
    useRunStore();

  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0];
  const currentNode = nodes[currentNodeIndex];
  const isBossNode = currentNode?.type === 'boss';
  const boss = isBossNode ? getBossForChapter(chapterIndex) : null;
  const opponentElo = boss?.elo ?? currentNode?.chapterElo ?? 500;
  const opponentName = boss?.name ?? 'Противник';

  const [dialogPhase, setDialogPhase] = useState<DialogPhase>(isBossNode ? 'before' : 'battle');
  const [battleResult, setBattleResult] = useState<{ result: 'win' | 'lose' | 'draw'; gold: number } | null>(
    null,
  );

  if (!isActive) {
    router.replace('/');
    return null;
  }

  function handleGameEnd(result: 'win' | 'lose' | 'draw', earnedGold: number) {
    if (result !== 'lose') {
      earnGold(earnedGold);
      completeNode(currentNodeIndex);
    }

    if (isBossNode && boss && result === 'win') {
      setBattleResult({ result, gold: earnedGold });
      setDialogPhase('after');
    } else {
      navigate(result, earnedGold);
    }
  }

  function navigate(result: 'win' | 'lose' | 'draw', gold: number) {
    if (result === 'lose') {
      router.replace({ pathname: '/defeat', params: { gold: String(gold) } });
    } else {
      router.replace({
        pathname: '/victory',
        params: { gold: String(gold), isBoss: isBossNode ? 'true' : 'false' },
      });
    }
  }

  if (dialogPhase === 'before' && boss) {
    return (
      <SafeAreaView style={styles.safe}>
        <BossDialog
          name={boss.name}
          text={boss.dialogBefore}
          onContinue={() => setDialogPhase('battle')}
          isBefore
        />
      </SafeAreaView>
    );
  }

  if (dialogPhase === 'after' && boss && battleResult) {
    return (
      <SafeAreaView style={styles.safe}>
        <BossDialog
          name={boss.name}
          text={boss.dialogAfter}
          onContinue={() => navigate(battleResult.result, battleResult.gold + boss.rewardGold)}
          isBefore={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <BattleScreen
        hero={hero}
        artifacts={artifacts}
        playerColor="w"
        opponentName={opponentName}
        opponentElo={opponentElo}
        skillLevel={eloToSkillLevel(opponentElo)}
        onGameEnd={handleGameEnd}
        onExit={() => router.replace('/adventure')}
      />
    </SafeAreaView>
  );
}

interface BossDialogProps {
  name: string;
  text: string;
  onContinue: () => void;
  isBefore: boolean;
}

function BossDialog({ name, text, onContinue, isBefore }: BossDialogProps) {
  return (
    <View style={dialog.container}>
      <Text style={dialog.crown}>👑</Text>
      <Text style={dialog.name}>{name}</Text>
      <View style={dialog.bubble}>
        <Text style={dialog.text}>{text}</Text>
      </View>
      <TouchableOpacity style={dialog.btn} onPress={onContinue} testID="boss-dialog-continue">
        <Text style={dialog.btnText}>{isBefore ? 'К битве!' : 'Продолжить'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
});

const dialog = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  crown:     { fontSize: 64, marginBottom: 8 },
  name:      { color: '#fbbf24', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  bubble:    { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 32, width: '100%' },
  text:      { color: '#e2e8f0', fontSize: 16, lineHeight: 26, textAlign: 'center' },
  btn:       { backgroundColor: '#f59e0b', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  btnText:   { color: '#0f172a', fontSize: 18, fontWeight: '900' },
});
