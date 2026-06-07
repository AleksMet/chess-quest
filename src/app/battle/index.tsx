import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BattleScreen } from '../../components/battle/BattleScreen';
import { useRunStore } from '../../store/runStore';
import { HEROES } from '../../data/heroes';
// TODO: пересмотреть — режим временно отключён (логика босса)
// import { getBossForChapter } from '../../data/bosses';
import { eloToSkillLevel } from '../../engine/stockfish';
// TODO: пересмотреть — режим временно отключён (логика босса)
// import { buildBossFen } from '../../engine/chessHelpers';

export default function BattlePage() {
  const router = useRouter();
  const { heroId, nodes, currentNodeIndex, blessedPiece, addScore, completeNode, markKingChecked, setCurrentFen, isActive } =
    useRunStore();

  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0];
  const currentNode = nodes[currentNodeIndex];
  // TODO: пересмотреть — режим временно отключён (этаж-босс убран из башни)
  // const isBossNode = currentNode?.type === 'boss';
  // const boss = isBossNode ? getBossForChapter(chapterIndex) : null;
  const opponentElo = currentNode?.chapterElo ?? 500;
  const opponentName = 'Противник';

  // TODO: пересмотреть — режим временно отключён (диалоги босса)
  // const [dialogPhase, setDialogPhase] = useState<DialogPhase>(isBossNode ? 'before' : 'battle');
  // const [battleResult, setBattleResult] = useState<{ result: 'win' | 'lose' | 'draw'; gold: number } | null>(null);

  if (!isActive) {
    router.replace('/');
    return null;
  }

  function handleGameEnd(result: 'win' | 'lose' | 'draw', earnedScore: number, fen: string) {
    if (result === 'win') {
      setCurrentFen(fen);
      addScore(earnedScore);
      completeNode(currentNodeIndex);
    } else if (result === 'draw') {
      completeNode(currentNodeIndex);
    }

    // TODO: пересмотреть — режим временно отключён (ветки исхода боя с боссом)
    // if (isBossNode && boss && result === 'win') {
    //   setBattleResult({ result, gold: earnedScore });
    //   setDialogPhase('after');
    // } else if (isBossNode && result === 'draw') {
    //   Alert.alert(
    //     'Ничья с боссом',
    //     'Ничья — золото не начислено. Забег завершён.',
    //     [{ text: 'Продолжить', onPress: () => router.replace('/run-complete') }],
    //   );
    // } else
    if (result === 'draw') {
      Alert.alert(
        'Ничья',
        'Ничья — золото не начислено',
        [{ text: 'Продолжить', onPress: () => router.replace('/adventure') }],
      );
    } else {
      navigate(result);
    }
  }

  function navigate(result: 'win' | 'lose' | 'draw') {
    if (result === 'lose') {
      router.replace('/defeat');
    } else {
      router.replace('/adventure');
    }
  }

  // TODO: пересмотреть — режим временно отключён (диалог босса «до боя»)
  // if (dialogPhase === 'before' && boss) {
  //   return (
  //     <SafeAreaView style={styles.safe}>
  //       <BossDialog
  //         name={boss.name}
  //         text={boss.dialogBefore}
  //         onContinue={() => setDialogPhase('battle')}
  //         isBefore
  //       />
  //     </SafeAreaView>
  //   );
  // }

  // TODO: пересмотреть — режим временно отключён (FEN босса)
  // const bossFen = isBossNode ? buildBossFen(currentFen) : undefined;

  // TODO: пересмотреть — режим временно отключён (диалог босса «после боя»)
  // if (dialogPhase === 'after' && boss && battleResult) {
  //   return (
  //     <SafeAreaView style={styles.safe}>
  //       <BossDialog
  //         name={boss.name}
  //         text={boss.dialogAfter}
  //         onContinue={() => {
  //           addScore(boss.rewardGold);
  //           navigate(battleResult.result);
  //         }}
  //         isBefore={false}
  //       />
  //     </SafeAreaView>
  //   );
  // }

  return (
    <SafeAreaView style={styles.safe}>
      <BattleScreen
        hero={hero}
        artifacts={[]} // TODO: ХАОС режим — pass real artifacts
        playerColor="w"
        opponentName={opponentName}
        opponentElo={opponentElo}
        skillLevel={eloToSkillLevel(opponentElo)}
        onGameEnd={handleGameEnd}
        onExit={() => router.replace('/adventure')}
        blessedPiece={blessedPiece}
        onKingChecked={markKingChecked}
      />
    </SafeAreaView>
  );
}

// TODO: пересмотреть — режим временно отключён (диалоговое окно босса)
// interface BossDialogProps {
//   name: string;
//   text: string;
//   onContinue: () => void;
//   isBefore: boolean;
// }
//
// function BossDialog({ name, text, onContinue, isBefore }: BossDialogProps) {
//   return (
//     <View style={dialog.container}>
//       <Text style={dialog.crown}>👑</Text>
//       <Text style={dialog.name}>{name}</Text>
//       <View style={dialog.bubble}>
//         <Text style={dialog.text}>{text}</Text>
//       </View>
//       <TouchableOpacity style={dialog.btn} onPress={onContinue} testID="boss-dialog-continue">
//         <Text style={dialog.btnText}>{isBefore ? 'К битве!' : 'Продолжить'}</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
});

// TODO: пересмотреть — режим временно отключён (стили диалога босса)
// const dialog = StyleSheet.create({
//   container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
//   crown:     { fontSize: 64, marginBottom: 8 },
//   name:      { color: '#fbbf24', fontSize: 22, fontWeight: '800', marginBottom: 16 },
//   bubble:    { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 32, width: '100%' },
//   text:      { color: '#e2e8f0', fontSize: 16, lineHeight: 26, textAlign: 'center' },
//   btn:       { backgroundColor: '#f59e0b', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
//   btnText:   { color: '#0f172a', fontSize: 18, fontWeight: '900' },
// });
