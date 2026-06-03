import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BattleScreen } from './src/components/battle/BattleScreen';
import { HEROES } from './src/data/heroes';
import { ARTIFACTS } from './src/data/artifacts';

const [timmy] = HEROES;
const starterArtifacts = ARTIFACTS.filter(a =>
  ['pawn_march', 'center_defender', 'castle_fortress'].includes(a.id)
);

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <BattleScreen
        hero={timmy}
        artifacts={starterArtifacts}
        playerColor="w"
        opponentName="Гоблинский Король"
        opponentElo={450}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
