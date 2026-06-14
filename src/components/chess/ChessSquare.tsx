import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

// ВРЕМЕННЫЙ ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ: вместо RadialGradient — сплошной цвет
const LIGHT_BG = '#d4e0f9';
const DARK_BG = '#8973f6';

// Клетка доски — радиальный градиент через react-native-svg.
// React.memo, чтобы клетки не перерисовывались при ходах.
export const ChessSquare = memo(function ChessSquare({ size, isLight }: { size: number; isLight: boolean }) {
  const bgColor = isLight ? LIGHT_BG : DARK_BG;

  return (
    <View style={[styles.squareImage, { width: size, height: size, backgroundColor: bgColor }]} />
  );
});

const styles = StyleSheet.create({
  squareImage: {
    position: 'absolute',
    top: 0, left: 0,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
});
