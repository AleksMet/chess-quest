import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import { getLegalMovesFrom, attemptMove } from '../../engine/chessLogic';
import type { MoveResult } from '../../engine/chessLogic';
import type { PieceKey } from './ChessPieceSVG';
import { useChapterTheme } from '../../contexts/ChapterThemeContext';

import { ChessPiece } from './ChessPiece';
import { ChessSquare } from './ChessSquare';

const BOARD_SIZE = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) * 0.9;

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
  size?: number;                      // размер доски в пикселях, по умолчанию BOARD_SIZE
  showCoordinates?: boolean;          // подписи координат поверх крайних клеток (режим ХАОС)
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
  pieceSize: number;
}

function PieceView({ pieceKey, pieceSize }: PieceViewProps) {
  return (
    <View style={styles.pieceContainer}>
      <ChessPiece pieceKey={pieceKey} size={pieceSize} />
    </View>
  );
}

// Только что заспавненная фигура (конь короля-босса) — плавно проявляется opacity 0→1
function SpawnedPieceView({ pieceKey, pieceSize }: PieceViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: SPAWN_FADE_IN_MS, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.pieceContainer, { opacity }]}>
      <ChessPiece pieceKey={pieceKey} size={pieceSize} />
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

interface CellProps {
  square: Square;
  isLight: boolean;
  pieceKey: PieceKey | null;
  squareTintColor: string | null;
  isOpponentLastMove: boolean;
  upgradeHighlightColor: string | null;
  upgradeHighlightOpacity: number;
  lastMoveHighlightColor: string | null;
  isLegalTarget: boolean;
  hasPiece: boolean;
  legalDotColor: string;
  isForcedSquare: boolean;
  isSpawned: boolean;
  cellStyle: ViewStyle;
  cellSize: number;
  pieceSize: number;
  legalMoveStyle: ViewStyle;
  legalCaptureStyle: ViewStyle;
  rankLabel?: string | null;
  fileLabel?: string | null;
  onPress: (square: Square) => void;
}

// Клетка доски — обёрнута в memo, чтобы при ходе перерисовывались только
// изменившиеся клетки, а не вся доска целиком (устраняет мигание PNG-текстур)
const Cell = memo(function Cell({
  square,
  isLight,
  pieceKey,
  squareTintColor,
  isOpponentLastMove,
  upgradeHighlightColor,
  upgradeHighlightOpacity,
  lastMoveHighlightColor,
  isLegalTarget,
  hasPiece,
  legalDotColor,
  isForcedSquare,
  isSpawned,
  cellStyle,
  cellSize,
  pieceSize,
  legalMoveStyle,
  legalCaptureStyle,
  rankLabel,
  fileLabel,
  onPress,
}: CellProps) {
  return (
    <TouchableOpacity
      testID={`square-${square}`}
      style={[styles.cell, cellStyle]}
      onPress={() => onPress(square)}
      activeOpacity={0.7}
    >
      <ChessSquare size={cellSize} isLight={isLight} />
      {squareTintColor && (
        <View style={[styles.upgradeOverlay, { backgroundColor: squareTintColor, opacity: 0.55 }]} />
      )}
      {isOpponentLastMove && (
        <View style={styles.opponentMoveOverlay} />
      )}
      {upgradeHighlightColor && (
        <View
          style={[styles.upgradeOverlay, { backgroundColor: upgradeHighlightColor, opacity: upgradeHighlightOpacity }]}
          testID={`upgrade-highlight-${square}`}
        />
      )}
      {lastMoveHighlightColor && (
        <View
          style={[styles.upgradeOverlay, { backgroundColor: lastMoveHighlightColor, opacity: 0.35 }]}
          testID={`last-move-highlight-${square}`}
        />
      )}
      {isLegalTarget && (
        <View
          style={[
            styles.legalDot,
            hasPiece ? legalCaptureStyle : legalMoveStyle,
            { backgroundColor: hasPiece ? 'transparent' : legalDotColor },
            hasPiece ? { borderColor: legalDotColor } : undefined,
          ]}
        />
      )}
      {isForcedSquare && <ForcedPieceBorder />}
      {rankLabel && (
        <Text style={styles.coordRankLabel} pointerEvents="none">{rankLabel}</Text>
      )}
      {fileLabel && (
        <Text style={styles.coordFileLabel} pointerEvents="none">{fileLabel}</Text>
      )}
      {pieceKey && (
        isSpawned
          ? <SpawnedPieceView key={`${pieceKey}-spawned`} pieceKey={pieceKey} pieceSize={pieceSize} />
          : <PieceView key={pieceKey} pieceKey={pieceKey} pieceSize={pieceSize} />
      )}
    </TouchableOpacity>
  );
});

export function ChessBoard({ chess, playerColor = 'w', onMove, disabled = false, highlightSquare, opponentLastMove, upgradeHighlights, spawnedSquare, forcedSquares, forcedMoves, lastMoveHighlight, size, showCoordinates = false }: ChessBoardProps) {
  const { theme } = useChapterTheme();
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = playerColor === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const orderedFiles = playerColor === 'w' ? files : [...files].reverse();

  // Размер доски передаётся пропсом (адаптивная вёрстка экрана боя) либо берётся
  // из BOARD_SIZE по умолчанию (вызовы без size — обычные режимы).
  // Округляем вниз до кратного 8, чтобы размер клетки был целым числом пикселей —
  // иначе при дробном cellSize между клетками видны субпиксельные линии.
  const boardSize = Math.floor((size ?? BOARD_SIZE) / 8) * 8;
  const cellSize = boardSize / 8;
  const pieceSize = cellSize * 0.85;

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

      const from = selectedSquare;
      const to = square;
      const result = attemptMove(chess, from, to, 'q');
      if (result.success && result.move) {
        setLastMove({ from, to });
        onMove?.(result);
      }

      setSelectedSquare(null);
      setLegalTargets([]);
    },
    [chess, selectedSquare, playerColor, disabled, onMove, isSquareForced, filterForcedTargets, isMoveForced]
  );

  // Стабильная обёртка над handleSquarePress: её ссылка не меняется между рендерами,
  // поэтому проп onPress у Cell остаётся стабильным и memo(Cell) не перерисовывает
  // все клетки на каждый рендер доски (устраняет мигание доски при ходах)
  const handleSquarePressRef = useRef(handleSquarePress);
  handleSquarePressRef.current = handleSquarePress;
  const onSquarePress = useCallback((square: Square) => handleSquarePressRef.current(square), []);

  const board = chess.board();

  const dynamicStyles = useMemo(() => ({
    container: { width: boardSize, height: boardSize },
    cell: { width: cellSize, height: cellSize },
    legalMove: { width: cellSize * 0.3, height: cellSize * 0.3 },
    legalCapture: {
      width: cellSize * 0.9,
      height: cellSize * 0.9,
      borderWidth: cellSize * 0.1,
      borderRadius: cellSize * 0.5,
    },
  }), [boardSize, cellSize]);

  return (
    <View style={[styles.boardFrame, dynamicStyles.container]} testID="chess-board">
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
            const isOpponentLastMove = opponentLastMove?.from === square || opponentLastMove?.to === square;
            const upgradeHighlight = upgradeHighlights?.find(h => h.square === square);
            const isForcedSquare = !!forcedSquares && forcedSquares.includes(square);
            const isLastMoveHighlightSquare = lastMoveHighlight?.from === square || lastMoveHighlight?.to === square;

            const pieceKey = cell
              ? (`${cell.color}${cell.type.toUpperCase()}` as PieceKey)
              : null;

            const squareTintColor = isHintSquare
              ? '#d97706'
              : isSelected
                ? theme.selectedSquare
                : isLastMoveSquare
                  ? theme.lastMoveSquare
                  : null;

            return (
              <Cell
                key={square}
                square={square}
                isLight={isLight}
                pieceKey={pieceKey}
                squareTintColor={squareTintColor}
                isOpponentLastMove={isOpponentLastMove}
                upgradeHighlightColor={upgradeHighlight ? UPGRADE_HIGHLIGHT_COLOR[upgradeHighlight.color] : null}
                upgradeHighlightOpacity={upgradeHighlight?.opacity ?? 0}
                lastMoveHighlightColor={
                  isLastMoveHighlightSquare && lastMoveHighlight
                    ? LAST_MOVE_HIGHLIGHT_COLOR[lastMoveHighlight.color]
                    : null
                }
                isLegalTarget={isLegalTarget}
                hasPiece={!!cell}
                legalDotColor={theme.legalDot}
                isForcedSquare={isForcedSquare}
                isSpawned={square === spawnedSquare}
                cellStyle={dynamicStyles.cell}
                cellSize={cellSize}
                pieceSize={pieceSize}
                legalMoveStyle={dynamicStyles.legalMove}
                legalCaptureStyle={dynamicStyles.legalCapture}
                rankLabel={showCoordinates && fileIdx === 0 ? String(rank) : null}
                fileLabel={showCoordinates && rankIdx === ranks.length - 1 ? file : null}
                onPress={onSquarePress}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    borderWidth: 2,
    borderColor: '#5050a0',
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    // Цвет тёмной клетки — заполняет субпиксельные зазоры между клетками
    backgroundColor: '#2d8a4e',
  },
  row: {
    flexDirection: 'row',
    gap: 0,
  },
  cell: {
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
  pieceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordRankLabel: {
    position: 'absolute',
    bottom: 1, left: 2,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
  coordFileLabel: {
    position: 'absolute',
    bottom: 4, right: 2,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
});
