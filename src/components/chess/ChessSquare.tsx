import { memo, useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const LIGHT_GRADIENT = { from: '#d4e0f9', to: '#b8bbf7' };
const DARK_GRADIENT = { from: '#8973f6', to: '#7a66f4' };

// Клетка доски — радиальный градиент через react-native-svg.
// React.memo, чтобы клетки не перерисовывались при ходах.
export const ChessSquare = memo(function ChessSquare({ size, isLight }: { size: number; isLight: boolean }) {
  const gradientId = useId().replace(/:/g, '');
  const colors = isLight ? LIGHT_GRADIENT : DARK_GRADIENT;

  return (
    <Svg width={size} height={size} style={styles.squareImage}>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" rx="70%" ry="70%" gradientUnits="objectBoundingBox">
          <Stop offset="0%" stopColor={colors.from} />
          <Stop offset="100%" stopColor={colors.to} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
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
