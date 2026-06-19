import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { BattleType, BattleModifier } from '../types/mechanics'

const BATTLE_TYPE_LABELS: Record<BattleType, string> = {
  standard: '⚔️ Стандартный бой',
  objective_queen_hunt: '🎯 Охота на Ферзя',
  objective_pawn_march: '🏰 Пешечный Марш',
  objective_royal_shield: '🛡️ Королевский Щит',
  elite: '💀 Элитное Испытание',
}

type ObjectiveInfo = { icon: string; goal: string; bonus: string; penalty?: string }

const OBJECTIVE_INFO: Partial<Record<BattleType, ObjectiveInfo>> = {
  objective_queen_hunt: {
    icon: '🎯',
    goal: 'Уничтожь ферзя врага',
    bonus: '+50🪙 если первым',
    penalty: '-30🪙 если потеряешь своего',
  },
  objective_pawn_march: {
    icon: '🏰',
    goal: 'Продвинь пешку до ряда 6',
    bonus: '+40🪙 за каждую (макс 2)',
  },
  objective_royal_shield: {
    icon: '🛡️',
    goal: 'Не более 2 шахов за бой',
    bonus: '+60🪙 если выполнил',
    penalty: 'Бонус сгорает на 3-м шахе',
  },
}

const MODIFIER_LABELS: Record<BattleModifier, string> = {
  reinforced_pawns: 'Усиленные пешки',
  golden_zone: 'Золотая зона',
  weak_flank: 'Слабый фланг',
  no_castling: 'Запрет рокировки',
  open_board: 'Открытая доска',
  berserk_knight: 'Берсерк-конь',
  double_knights: 'Двойные кони',
  berserk_queen: 'Берсерк-ферзь',
  closed_board: 'Закрытая доска',
}

type Props = {
  battleType: BattleType
  modifier: BattleModifier | null
  elo: number
  onClose: () => void
}

export function BattleBanner({ battleType, modifier, elo, onClose }: Props) {
  const objectiveInfo = OBJECTIVE_INFO[battleType] ?? null
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <View style={styles.card}>
        <Text style={styles.battleType}>{BATTLE_TYPE_LABELS[battleType]}</Text>
        {modifier && (
          <Text style={styles.modifier}>⚡ {MODIFIER_LABELS[modifier]}</Text>
        )}
        <Text style={styles.eloText}>ELO {elo}</Text>
        {objectiveInfo && (
          <View style={styles.objectiveBlock}>
            <Text style={styles.objectiveIcon}>{objectiveInfo.icon}</Text>
            <Text style={styles.objectiveGoal}>{objectiveInfo.goal}</Text>
            <Text style={styles.objectiveBonus}>{objectiveInfo.bonus}</Text>
            {objectiveInfo.penalty && (
              <Text style={styles.objectivePenalty}>{objectiveInfo.penalty}</Text>
            )}
          </View>
        )}
        <Pressable onPress={onClose} style={styles.startBtnWrap}>
          <LinearGradient
            colors={['#8a5e18', '#c8963c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtn}
          >
            <Text style={styles.startBtnText}>В бой</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: '#1a1423',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
    minWidth: 220,
  },
  battleType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#eab308',
    textAlign: 'center',
  },
  modifier: {
    fontSize: 12,
    color: '#a855f7',
    textAlign: 'center',
  },
  eloText: {
    fontSize: 11,
    color: '#7a6a90',
  },
  startBtnWrap: {
    width: '100%',
    marginTop: 6,
  },
  startBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d4a040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#f8e8b0',
    fontSize: 13,
    fontWeight: '700',
  },
  objectiveBlock: {
    backgroundColor: 'rgba(234,179,8,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  objectiveIcon:    { fontSize: 24 },
  objectiveGoal:    { fontSize: 13, color: '#eab308', fontWeight: '700', textAlign: 'center' },
  objectiveBonus:   { fontSize: 11, color: '#4ade80', textAlign: 'center' },
  objectivePenalty: { fontSize: 11, color: '#ef4444', textAlign: 'center' },
})
