import { useEffect, useRef } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMetaStore } from '../store/metaStore';
import { StarBackground } from '../components/StarBackground';

const PIECE_ICONS = ['♔', '♕', '♘', '♗', '♖'];

export default function MainMenuScreen() {
  const router = useRouter();
  const { isLoaded, loadMeta } = useMetaStore();
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMeta().then(() => {
      if (!useMetaStore.getState().meta.onboardingCompleted) {
        router.replace('/onboarding');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Пульсация свечения заголовка "QUEST"
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ]),
    ).start();
  }, [glowAnim]);

  const titleShadowRadius = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 28] });

  function handleStartChaos() {
    router.push('/chaos-character-select');
  }

  if (!isLoaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <StarBackground />

      <View style={styles.topSection}>
        <Text style={styles.titleSub}>CHESS</Text>
        <Animated.Text style={[styles.titleMain, { textShadowRadius: titleShadowRadius }]}>
          QUEST
        </Animated.Text>
        <View style={styles.titleDeco}>
          <View style={styles.decoLine} />
          <Text style={styles.decoRune}>✦ ᛏ ᚱ ✦</Text>
          <View style={styles.decoLine} />
        </View>
      </View>

      <View style={styles.pieceRow}>
        {PIECE_ICONS.map(icon => (
          <Text key={icon} style={styles.pieceIcon}>{icon}</Text>
        ))}
      </View>

      <View style={styles.buttons}>
        <MenuButton
          icon="⚔️"
          label="НАЧАТЬ ЗАБЕГ"
          onPress={handleStartChaos}
          large
          testID="start-chaos-btn"
        />
        <MenuButton icon="↩" label="ПРОДОЛЖИТЬ" large disabled />
        <View style={styles.btnDivider} />
        <MenuButton icon="🏆" label="РЕЙТИНГ" disabled />
        <MenuButton icon="⚙️" label="НАСТРОЙКИ" disabled />
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.bottomRune}>✦ ᚢ ᚦ ✦</Text>
        <Text style={styles.versionText}>v 1.0.0 · Chess Quest</Text>
      </View>
    </SafeAreaView>
  );
}

interface MenuButtonProps {
  icon: string;
  label: string;
  onPress?: () => void;
  large?: boolean;
  disabled?: boolean;
  testID?: string;
}

function MenuButton({ icon, label, onPress, large, disabled, testID }: MenuButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={['#1e0a3c', '#2d1060', '#1a0830']}
          locations={[0, 0.5, 1]}
          style={[
            large ? styles.btnLarge : styles.btnSmall,
            disabled && styles.btnDisabled,
          ]}
        >
          <Text style={styles.btnIcon}>{icon}</Text>
          <Text style={[styles.btnText, !large && styles.btnTextSmall]}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0b0418',
    alignItems: 'center',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 56,
    gap: 6,
  },
  titleSub: {
    fontSize: 11,
    letterSpacing: 8,
    color: '#a855f7',
    opacity: 0.75,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  titleMain: {
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#eab308',
    textShadowColor: 'rgba(234,179,8,0.7)',
    textShadowOffset: { width: 0, height: 0 },
  },
  titleDeco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  decoLine: {
    height: 1,
    width: 55,
    backgroundColor: '#eab308',
    opacity: 0.4,
  },
  decoRune: {
    fontSize: 11,
    color: '#a855f7',
    opacity: 0.65,
    letterSpacing: 4,
    fontFamily: 'serif',
  },
  pieceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 18,
    opacity: 0.55,
  },
  pieceIcon: {
    fontSize: 22,
    color: '#eab308',
  },
  buttons: {
    alignItems: 'center',
    gap: 14,
    marginTop: 32,
    width: '100%',
  },
  btnLarge: {
    width: 220,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#a855f7',
    backgroundColor: '#2d1060',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#a855f7',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  btnSmall: {
    width: 180,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#a855f7',
    backgroundColor: '#2d1060',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#a855f7',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnIcon: {
    fontSize: 17,
    lineHeight: 17,
  },
  btnText: {
    fontFamily: 'serif',
    fontSize: 13,
    fontWeight: '700',
    color: '#eab308',
    letterSpacing: 1.5,
  },
  btnTextSmall: {
    fontSize: 11,
  },
  btnDivider: {
    width: 160,
    height: 1,
    backgroundColor: 'rgba(168,85,247,0.3)',
    marginVertical: 2,
    alignSelf: 'center',
  },
  bottomSection: {
    marginTop: 'auto',
    paddingBottom: 28,
    alignItems: 'center',
    gap: 6,
  },
  bottomRune: {
    fontSize: 10,
    color: '#a855f7',
    opacity: 0.3,
    letterSpacing: 5,
    fontFamily: 'serif',
  },
  versionText: {
    fontSize: 9,
    color: '#4a3060',
    letterSpacing: 1,
    fontFamily: 'System',
  },
});
