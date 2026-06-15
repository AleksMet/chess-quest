import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

const LIGHT_COLOR = '#ffffff';
const DARK_COLOR = '#2d8a4e';

// Клетка доски — плоский цвет.
// React.memo, чтобы клетки не перерисовывались при ходах.
export const ChessSquare = memo(function ChessSquare({ size, isLight }: { size: number; isLight: boolean }) {
  const bgColor = isLight ? LIGHT_COLOR : DARK_COLOR;

  return <View style={[styles.squareImage, { width: size, height: size, backgroundColor: bgColor }]} />;
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
