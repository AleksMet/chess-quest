import { SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BattleScreen } from '../../components/battle/BattleScreen';
import { useRunStore } from '../../store/runStore';
import { HEROES } from '../../data/heroes';
import { eloToSkillLevel } from '../../engine/stockfish';

export default function BattlePage() {
  const router = useRouter();
  const { heroId, artifacts, nodes, currentNodeIndex, earnGold, completeNode } = useRunStore();
  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0];
  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? 500;

  function handleGameEnd(result: 'win' | 'lose' | 'draw', earnedGold: number) {
    if (result !== 'lose') {
      earnGold(earnedGold);
    }
    completeNode(currentNodeIndex);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <BattleScreen
        hero={hero}
        artifacts={artifacts}
        playerColor="w"
        opponentName={currentNode?.type === 'boss' ? 'Гоблинский Король' : 'Противник'}
        opponentElo={opponentElo}
        skillLevel={eloToSkillLevel(opponentElo)}
        onGameEnd={handleGameEnd}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
});
