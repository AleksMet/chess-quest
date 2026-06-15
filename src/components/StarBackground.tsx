import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Космический фон главного меню: градиент + мерцающие звёзды.

const STAR_COUNT = 80;

interface StarConfig {
  left: number;
  top: number;
  size: number;
  baseAlpha: number;
  duration: number;
  delay: number;
}

function makeStars(width: number, height: number): StarConfig[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    left: Math.random() * width,
    top: Math.random() * height * 0.7,
    size: 1 + Math.random() * 2,
    baseAlpha: 0.1 + Math.random() * 0.7,
    duration: 2000 + Math.random() * 3000,
    delay: Math.random() * 3000,
  }));
}

export function StarBackground() {
  const { width, height } = useWindowDimensions();
  const starsRef = useRef<StarConfig[] | null>(null);
  if (!starsRef.current) {
    starsRef.current = makeStars(width, height);
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={['#1e0a3c', '#130625', '#0b0418', '#060210']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(15,44,31,0.45)']}
        start={{ x: 0.5, y: 0.7 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.fill, styles.mist]}
      />
      {starsRef.current.map((star, i) => (
        <Star key={i} {...star} />
      ))}
    </View>
  );
}

function Star({ left, top, size, baseAlpha, duration, delay }: StarConfig) {
  const opacity = useRef(new Animated.Value(baseAlpha)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.1, duration, useNativeDriver: false }),
          Animated.timing(opacity, { toValue: baseAlpha, duration, useNativeDriver: false }),
        ]),
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [opacity, baseAlpha, duration, delay]);

  return (
    <Animated.View
      style={[
        styles.star,
        { left, top, width: size, height: size, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  mist: {
    opacity: 0.45,
  },
  star: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#ffffff',
  },
});
