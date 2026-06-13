import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Rect, Defs, RadialGradient, Stop } from 'react-native-svg';

// Радиальные градиенты клеток доски
const LIGHT_SQUARE_COLORS = { center: '#a8a8d8', mid: '#8b8bc0', edge: '#6060a0' };
const DARK_SQUARE_COLORS = { center: '#8080b8', mid: '#6b6b9e', edge: '#4a4a80' };

// Линии сетки между клетками — цвет тёмной клетки. Только правый и нижний
// border у каждой клетки, иначе соседние клетки рисуют общую линию дважды.
const GRID_LINE_COLOR = '#4a4a80';

// Клетка доски — радиальный градиент через react-native-svg.
// React.memo, чтобы клетки не перерисовывались при ходах.
export const ChessSquare = memo(function ChessSquare({ size, isLight }: { size: number; isLight: boolean }) {
  const colors = isLight ? LIGHT_SQUARE_COLORS : DARK_SQUARE_COLORS;
  const gradId = isLight ? 'lg' : 'dg';

  return (
    <Svg width={size} height={size} style={[styles.squareImage, styles.gridLines]}>
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
          <Stop offset="0%" stopColor={colors.center} />
          <Stop offset="60%" stopColor={colors.mid} />
          <Stop offset="100%" stopColor={colors.edge} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${gradId})`} />
    </Svg>
  );
});

const styles = StyleSheet.create({
  squareImage: {
    position: 'absolute',
    top: 0, left: 0,
  },
  gridLines: {
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: GRID_LINE_COLOR,
  },
});
