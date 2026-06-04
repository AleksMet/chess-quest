import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import type { RewardBreakdownItem } from '../../types';

interface GoldPopupProps {
  total: number;
  breakdown: RewardBreakdownItem[];
  onDone: () => void;
}

const ROW_DELAY  = 90;
const APPEAR_MS  = 150;
const HOLD_MS    = 900;
const FADE_MS    = 250;

const TYPE_COLOR: Record<string, string> = {
  base:       '#94a3b8',
  artifact:   '#f59e0b',
  multiplier: '#a78bfa',
  hero:       '#34d399',
};

export function GoldPopup({ total, breakdown, onDone }: GoldPopupProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const called     = useRef(false);

  useEffect(() => {
    const totalDelay = APPEAR_MS + (breakdown.length + 1) * ROW_DELAY + HOLD_MS;

    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0.85, duration: APPEAR_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0,    duration: APPEAR_MS, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: FADE_MS, useNativeDriver: true }),
      ]).start(() => {
        if (!called.current) { called.current = true; onDone(); }
      });
    }, totalDelay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      {breakdown.map((item, i) => (
        <DelayedRow key={i} item={item} delayMs={APPEAR_MS + i * ROW_DELAY} />
      ))}
      <DelayedTotal total={total} delayMs={APPEAR_MS + breakdown.length * ROW_DELAY} />
    </Animated.View>
  );
}

function DelayedRow({ item, delayMs }: { item: RewardBreakdownItem; delayMs: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(ty,      { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }, delayMs);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = item.type === 'multiplier' ? `×${item.value}` : `+${item.value}`;

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ translateY: ty }] }]}>
      <Text style={styles.rowLabel}>{item.label}</Text>
      <Text style={[styles.rowValue, { color: TYPE_COLOR[item.type] ?? '#f59e0b' }]}>{label}</Text>
    </Animated.View>
  );
}

function DelayedTotal({ total, delayMs }: { total: number; delayMs: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }, delayMs);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.divider, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.totalLabel}>= +{total} 💰</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    right: 8,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    gap: 3,
    zIndex: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row:        { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  rowLabel:   { color: '#94a3b8', fontSize: 13 },
  rowValue:   { fontSize: 13, fontWeight: '700' },
  divider:    { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 4, paddingTop: 6, alignItems: 'center' },
  totalLabel: { color: '#ffd700', fontSize: 20, fontWeight: '900' },
});
