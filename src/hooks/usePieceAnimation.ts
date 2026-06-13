import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export interface AnimatingPiece {
  piece: string;       // 'wN', 'bP' и т.д.
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function usePieceAnimation() {
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const animatingPiece = useRef<AnimatingPiece | null>(null);
  const isAnimating = useRef(false);

  const animateMove = useCallback((
    piece: AnimatingPiece,
    squareSize: number,
    onComplete: () => void
  ) => {
    animatingPiece.current = piece;
    isAnimating.current = true;
    animX.setValue(piece.from.x * squareSize);
    animY.setValue(piece.from.y * squareSize);

    Animated.parallel([
      Animated.timing(animX, {
        toValue: piece.to.x * squareSize,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(animY, {
        toValue: piece.to.y * squareSize,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
      animatingPiece.current = null;
      onComplete();
    });
  }, [animX, animY]);

  return { animX, animY, animatingPiece, isAnimating, animateMove };
}
