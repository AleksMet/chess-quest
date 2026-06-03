import { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import { getLegalMovesFrom, attemptMove } from '../../engine/chessLogic';
import type { MoveResult } from '../../engine/chessLogic';

const BOARD_SIZE = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) * 0.9;
const CELL_SIZE = BOARD_SIZE / 8;

const PIECE_SYMBOLS: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

interface ChessBoardProps {
  chess: Chess;
  playerColor?: Color;
  onMove?: (result: MoveResult) => void;
  disabled?: boolean;
}

interface AnimatedPieceProps {
  symbol: string;
  isWhite: boolean;
  animate: boolean;
}

function AnimatedPiece({ symbol, isWhite, animate }: AnimatedPieceProps) {
  const scale = useSharedValue(animate ? 0.6 : 1.0);

  useEffect(() => {
    if (animate) {
      scale.value = withSpring(1.0, { damping: 10, stiffness: 200 });
    }
  }, []); // intentionally runs only on mount to trigger entry animation

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text
      style={[
        styles.piece,
        isWhite ? styles.whitePiece : styles.blackPiece,
        animStyle,
      ]}
    >
      {symbol}
    </Animated.Text>
  );
}

export function ChessBoard({ chess, playerColor = 'w', onMove, disabled = false }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = playerColor === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const orderedFiles = playerColor === 'w' ? files : [...files].reverse();

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (disabled) return;

      const piece = chess.get(square);

      if (!selectedSquare) {
        if (piece && piece.color === playerColor && chess.turn() === playerColor) {
          setSelectedSquare(square);
          const moves = getLegalMovesFrom(chess, square);
          setLegalTargets(moves.map(m => m.to as Square));
        }
        return;
      }

      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      if (piece && piece.color === playerColor) {
        setSelectedSquare(square);
        const moves = getLegalMovesFrom(chess, square);
        setLegalTargets(moves.map(m => m.to as Square));
        return;
      }

      const result = attemptMove(chess, selectedSquare, square, 'q');
      if (result.success && result.move) {
        setLastMove({ from: selectedSquare, to: square });
        onMove?.(result);
      }

      setSelectedSquare(null);
      setLegalTargets([]);
    },
    [chess, selectedSquare, playerColor, disabled, onMove]
  );

  const board = chess.board();

  return (
    <View style={styles.container} testID="chess-board">
      {ranks.map((rank, rankIdx) => (
        <View key={rank} style={styles.row}>
          {orderedFiles.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const rankIndex = 8 - rank;
            const fileIndex = files.indexOf(file);
            const cell = board[rankIndex]?.[fileIndex];

            const isLight = (rankIdx + fileIdx) % 2 === 0;
            const isSelected = square === selectedSquare;
            const isLegalTarget = legalTargets.includes(square);
            const isLastMoveSquare = lastMove?.from === square || lastMove?.to === square;
            const isJustMoved = square === lastMove?.to;

            const pieceKey = cell ? `${cell.color}${cell.type.toUpperCase()}` : null;
            const pieceSymbol = pieceKey ? PIECE_SYMBOLS[pieceKey] : null;

            return (
              <TouchableOpacity
                key={square}
                testID={`square-${square}`}
                style={[
                  styles.cell,
                  isLight ? styles.lightCell : styles.darkCell,
                  isSelected && styles.selectedCell,
                  isLastMoveSquare && !isSelected && styles.lastMoveCell,
                ]}
                onPress={() => handleSquarePress(square)}
                activeOpacity={0.7}
              >
                {isLegalTarget && (
                  <View style={[styles.legalDot, cell ? styles.legalCapture : styles.legalMove]} />
                )}
                {pieceSymbol && (
                  <AnimatedPiece
                    key={isJustMoved ? `${square}-${lastMove?.from}` : square}
                    symbol={pieceSymbol}
                    isWhite={cell!.color === 'w'}
                    animate={isJustMoved}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 2,
    borderColor: '#4a3728',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightCell: {
    backgroundColor: '#f0d9b5',
  },
  darkCell: {
    backgroundColor: '#b58863',
  },
  selectedCell: {
    backgroundColor: '#7fc97f',
  },
  lastMoveCell: {
    backgroundColor: '#cdd16f',
  },
  legalDot: {
    position: 'absolute',
    borderRadius: 50,
  },
  legalMove: {
    width: CELL_SIZE * 0.3,
    height: CELL_SIZE * 0.3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  legalCapture: {
    width: CELL_SIZE * 0.9,
    height: CELL_SIZE * 0.9,
    borderWidth: CELL_SIZE * 0.1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    backgroundColor: 'transparent',
    borderRadius: CELL_SIZE * 0.5,
  },
  piece: {
    fontSize: CELL_SIZE * 0.75,
    lineHeight: CELL_SIZE * 0.85,
  },
  whitePiece: {
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  blackPiece: {
    color: '#1a1a1a',
    textShadowColor: '#888',
    textShadowOffset: { width: 0.3, height: 0.3 },
    textShadowRadius: 0.5,
  },
});
