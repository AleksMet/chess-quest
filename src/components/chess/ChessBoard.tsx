import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import { getLegalMovesFrom, attemptMove } from '../../engine/chessLogic';
import type { MoveResult } from '../../engine/chessLogic';
import { ChessPieceSVG } from './ChessPieceSVG';
import type { PieceKey } from './ChessPieceSVG';
import { useChapterTheme } from '../../contexts/ChapterThemeContext';

const BOARD_SIZE = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) * 0.9;
const CELL_SIZE = BOARD_SIZE / 8;
const PIECE_SIZE = CELL_SIZE * 0.88;

interface UpgradeHighlight {
  square: Square;
  color: 'red' | 'blue' | 'gold' | 'purple';
  opacity: number;
}

interface LastMoveHighlight {
  from: Square;
  to: Square;
  color: 'player' | 'opponent';
}

interface ChessBoardProps {
  chess: Chess;
  playerColor?: Color;
  onMove?: (result: MoveResult) => void;
  disabled?: boolean;
  highlightSquare?: string;           // hint square, pulsed amber
  opponentLastMove?: { from: string; to: string } | null;  // opponent move overlay
  upgradeHighlights?: UpgradeHighlight[]; // улучшенные фигуры режима ХАОС — подсветка клетки под фигурой
  spawnedSquare?: Square | null;      // клетка только что заспавненной фигуры — анимация появления opacity 0→1
  forcedSquares?: Square[];           // Берсерк игрока: ходить можно только этими фигурами (мигающая рамка)
  forcedMoves?: string[];             // Берсерк игрока: разрешены только эти ходы, в формате LAN ("e2e4")
  lastMoveHighlight?: LastMoveHighlight | null; // подсветка клеток последнего хода (режим ХАОС)
}

const UPGRADE_HIGHLIGHT_COLOR: Record<UpgradeHighlight['color'], string> = {
  red:    '#FF4444',
  blue:   '#4444FF',
  gold:   '#FFD700',
  purple: '#9333EA',
};

const LAST_MOVE_HIGHLIGHT_COLOR: Record<LastMoveHighlight['color'], string> = {
  player:   '#22C55E',
  opponent: '#FFD700',
};

const SPAWN_FADE_IN_MS = 500;

interface PieceViewProps {
  pieceKey: PieceKey;
}

function PieceView({ pieceKey }: PieceViewProps) {
  return (
    <View style={styles.pieceContainer}>
      <ChessPieceSVG pieceKey={pieceKey} size={PIECE_SIZE} />
    </View>
  );
}

// Только что заспавненная фигура (конь короля-босса) — плавно проявляется opacity 0→1
function SpawnedPieceView({ pieceKey }: PieceViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: SPAWN_FADE_IN_MS, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.pieceContainer, { opacity }]}>
      <ChessPieceSVG pieceKey={pieceKey} size={PIECE_SIZE} />
    </Animated.View>
  );
}

const FORCED_BLINK_MS = 450;

// Мигающая красная рамка вокруг фигуры, обязанной атаковать (Берсерк игрока — ЗАДАЧА 3)
function ForcedPieceBorder() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: FORCED_BLINK_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: FORCED_BLINK_MS, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.forcedBorder, { opacity }]} pointerEvents="none" testID="forced-piece-border" />;
}

export function ChessBoard({ chess, playerColor = 'w', onMove, disabled = false, highlightSquare, opponentLastMove, upgradeHighlights, spawnedSquare, forcedSquares, forcedMoves, lastMoveHighlight }: ChessBoardProps) {
  const { theme } = useChapterTheme();
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = playerColor === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const orderedFiles = playerColor === 'w' ? files : [...files].reverse();

  // Берсерк обязан атаковать: если forcedSquares задан, ходить можно только этими фигурами,
  // а forcedMoves ограничивает доступные цели клетками из списка разрешённых ходов (LAN: "e2e4")
  const isSquareForced = useCallback(
    (square: Square) => !forcedSquares || forcedSquares.length === 0 || forcedSquares.includes(square),
    [forcedSquares]
  );

  const filterForcedTargets = useCallback(
    (from: Square, moves: { to: string }[]) => {
      if (!forcedMoves || forcedMoves.length === 0) return moves;
      return moves.filter(m => forcedMoves.some(lan => lan.startsWith(`${from}${m.to}`)));
    },
    [forcedMoves]
  );

  const isMoveForced = useCallback(
    (from: Square, to: Square) => !forcedMoves || forcedMoves.length === 0 || forcedMoves.some(lan => lan.startsWith(`${from}${to}`)),
    [forcedMoves]
  );

  const handleSquarePress = useCallback(
    (square: Square) => {
      if (disabled) return;
      const piece = chess.get(square);

      if (!selectedSquare) {
        if (piece && piece.color === playerColor && chess.turn() === playerColor && isSquareForced(square)) {
          setSelectedSquare(square);
          const moves = getLegalMovesFrom(chess, square);
          setLegalTargets(filterForcedTargets(square, moves).map(m => m.to as Square));
        }
        return;
      }

      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalTargets([]);
        return;
      }

      if (piece && piece.color === playerColor) {
        if (!isSquareForced(square)) {
          setSelectedSquare(null);
          setLegalTargets([]);
          return;
        }
        setSelectedSquare(square);
        const moves = getLegalMovesFrom(chess, square);
        setLegalTargets(filterForcedTargets(square, moves).map(m => m.to as Square));
        return;
      }

      if (!isMoveForced(selectedSquare, square)) {
        setSelectedSquare(null);
        setLegalTargets([]);
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
    [chess, selectedSquare, playerColor, disabled, onMove, isSquareForced, filterForcedTargets, isMoveForced]
  );

  const board = chess.board();

  return (
    <View
      style={[styles.container, { borderColor: theme.boardBorder }]}
      testID="chess-board"
    >
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
            const isHintSquare = square === highlightSquare;
            const isJustMoved = square === lastMove?.to;
            const isOpponentLastMove = opponentLastMove?.from === square || opponentLastMove?.to === square;
            const upgradeHighlight = upgradeHighlights?.find(h => h.square === square);
            const isForcedSquare = !!forcedSquares && forcedSquares.includes(square);
            const isLastMoveHighlightSquare = lastMoveHighlight?.from === square || lastMoveHighlight?.to === square;

            const pieceKey = cell
              ? (`${cell.color}${cell.type.toUpperCase()}` as PieceKey)
              : null;

            const squareBg = isHintSquare
              ? '#d97706'
              : isSelected
                ? theme.selectedSquare
                : isLastMoveSquare
                  ? theme.lastMoveSquare
                  : isLight
                    ? theme.boardLight
                    : theme.boardDark;

            return (
              <TouchableOpacity
                key={square}
                testID={`square-${square}`}
                style={[styles.cell, { backgroundColor: squareBg }]}
                onPress={() => handleSquarePress(square)}
                activeOpacity={0.7}
              >
                {isOpponentLastMove && (
                  <View style={styles.opponentMoveOverlay} />
                )}
                {upgradeHighlight && (
                  <View
                    style={[
                      styles.upgradeOverlay,
                      { backgroundColor: UPGRADE_HIGHLIGHT_COLOR[upgradeHighlight.color], opacity: upgradeHighlight.opacity },
                    ]}
                    testID={`upgrade-highlight-${square}`}
                  />
                )}
                {isLastMoveHighlightSquare && lastMoveHighlight && (
                  <View
                    style={[
                      styles.upgradeOverlay,
                      { backgroundColor: LAST_MOVE_HIGHLIGHT_COLOR[lastMoveHighlight.color], opacity: 0.35 },
                    ]}
                    testID={`last-move-highlight-${square}`}
                  />
                )}
                {isLegalTarget && (
                  <View
                    style={[
                      styles.legalDot,
                      cell ? styles.legalCapture : styles.legalMove,
                      { backgroundColor: cell ? 'transparent' : theme.legalDot },
                      cell ? { borderColor: theme.legalDot } : undefined,
                    ]}
                  />
                )}
                {isForcedSquare && <ForcedPieceBorder />}
                {pieceKey && (
                  square === spawnedSquare
                    ? <SpawnedPieceView key={`${square}-spawned`} pieceKey={pieceKey} />
                    : <PieceView key={isJustMoved ? `${square}-moved` : square} pieceKey={pieceKey} />
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
  opponentMoveOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFD700',
    opacity: 0.4,
  },
  upgradeOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  forcedBorder: {
    position: 'absolute',
    top: 2, left: 2, right: 2, bottom: 2,
    borderWidth: 3,
    borderColor: '#FF4444',
    borderRadius: 4,
  },
  legalDot: {
    position: 'absolute',
    borderRadius: 50,
  },
  legalMove: {
    width: CELL_SIZE * 0.3,
    height: CELL_SIZE * 0.3,
  },
  legalCapture: {
    width: CELL_SIZE * 0.9,
    height: CELL_SIZE * 0.9,
    borderWidth: CELL_SIZE * 0.1,
    backgroundColor: 'transparent',
    borderRadius: CELL_SIZE * 0.5,
  },
  pieceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
