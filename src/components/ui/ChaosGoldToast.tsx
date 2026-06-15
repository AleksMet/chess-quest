import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

// Всплывающее уведомление о золоте в бою режима ХАОС: "+20 золота — Жадный".
// Стек уведомлений в правом верхнем углу — каждое новое появляется чуть ниже предыдущих.

export interface GoldToastItem {
  id: number;
  text: string;
}

const SHOW_MS = 1500;
const FADE_MS = 200;
const ROW_HEIGHT = 34;

interface ChaosGoldToastStackProps {
  items: GoldToastItem[];
  onExpire: (id: number) => void;
}

export function ChaosGoldToastStack({ items, onExpire }: ChaosGoldToastStackProps) {
  if (items.length === 0) return null;
  return (
    <View style={styles.stack} pointerEvents="none">
      {items.map((item, index) => (
        <ChaosGoldToast key={item.id} text={item.text} index={index} onDone={() => onExpire(item.id)} />
      ))}
    </View>
  );
}

interface ChaosGoldToastProps {
  text: string;
  index: number;
  onDone: () => void;
}

function ChaosGoldToast({ text, index, onDone }: ChaosGoldToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const done = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
        if (!done.current) { done.current = true; onDone(); }
      });
    }, SHOW_MS - FADE_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.toast, { top: index * ROW_HEIGHT, opacity, transform: [{ translateY }] }]}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: [{ translateY: -50 }],
    zIndex: 20,
  },
  toast: {
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(15,10,25,0.93)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.5)',
  },
  text: {
    color: '#e5e5e5',
    fontSize: 9,
  },
});
