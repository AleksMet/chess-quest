import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { Animated, Image, View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { ImageSourcePropType, ImageStyle, ViewStyle } from 'react-native';
import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import { getLegalMovesFrom, attemptMove } from '../../engine/chessLogic';
import type { MoveResult } from '../../engine/chessLogic';
import type { PieceKey } from './ChessPieceSVG';
import { useChapterTheme } from '../../contexts/ChapterThemeContext';

import { ChessPiece } from './ChessPiece';
import { ChessSquare } from './ChessSquare';
import { usePieceAnimation } from '../../hooks/usePieceAnimation';
import wQaImg from '../../assets/chess-pieces/attack/wQa.png';
import wRaImg from '../../assets/chess-pieces/attack/wRa.png';
import wBaImg from '../../assets/chess-pieces/attack/wBa.png';
import wNaImg from '../../assets/chess-pieces/attack/wNa.png';
import wPaImg from '../../assets/chess-pieces/attack/wPa.png';
import bQaImg from '../../assets/chess-pieces/attack/bQa.png';
import bRaImg from '../../assets/chess-pieces/attack/bRa.png';
import bBaImg from '../../assets/chess-pieces/attack/bBa.png';
import bPaImg from '../../assets/chess-pieces/attack/bPa.png';

const BOARD_SIZE = Math.min(Dimensions.get('window').width, Dimensions.get('window').height) * 0.9;

// Координаты клетки на доске в «ячейках» (0..7) для анимации перемещения фигуры —
// учитывает разворот доски за чёрных (flipped)
function squareToCoords(square: Square, flipped: boolean): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97; // a=0..h=7
  const rank = parseInt(square[1], 10); // 1..8
  return flipped ? { x: 7 - file, y: rank - 1 } : { x: file, y: 8 - rank };
}

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
  attackSquares?: Square[];           // фигуры с атакующим улучшением (Берсерк/Снайпер) — рендерятся PNG из attack/
  size?: number;                      // размер доски в пикселях, по умолчанию BOARD_SIZE
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

// Изображения атакующих улучшений (Берсерк/Снайпер) — заменяют SVG фигуры игрока.
// bN отсутствует в ассетах (не используется — атакующие улучшения только у игрока, белые фигуры).
const ATTACK_PIECE_IMAGES: Partial<Record<PieceKey, ImageSourcePropType>> = {
  wQ: wQaImg, wR: wRaImg, wB: wBaImg, wN: wNaImg, wP: wPaImg,
  bQ: bQaImg, bR: bRaImg, bB: bBaImg, bP: bPaImg,
};

interface PieceViewProps {
  pieceKey: PieceKey;
  useAttackImage?: boolean;
  pieceSize: number;
  pieceImageStyle: ImageStyle;
}

function PieceView({ pieceKey, useAttackImage, pieceSize, pieceImageStyle }: PieceViewProps) {
  const attackImage = useAttackImage ? ATTACK_PIECE_IMAGES[pieceKey] : undefined;
  return (
    <View style={styles.pieceContainer}>
      {attackImage ? (
        <Image source={attackImage} style={pieceImageStyle} resizeMode="contain" fadeDuration={0} />
      ) : (
        <ChessPiece pieceKey={pieceKey} size={pieceSize} />
      )}
    </View>
  );
}

// Только что заспавненная фигура (конь короля-босса) — плавно проявляется opacity 0→1
function SpawnedPieceView({ pieceKey, useAttackImage, pieceSize, pieceImageStyle }: PieceViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const attackImage = useAttackImage ? ATTACK_PIECE_IMAGES[pieceKey] : undefined;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: SPAWN_FADE_IN_MS, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.pieceContainer, { opacity }]}>
      {attackImage ? (
        <Image source={attackImage} style={pieceImageStyle} resizeMode="contain" fadeDuration={0} />
      ) : (
        <ChessPiece pieceKey={pieceKey} size={pieceSize} />
      )}
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
  isAttackPiece: boolean;
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
  isJustMoved: boolean;
  cellStyle: ViewStyle;
  cellSize: number;
  pieceSize: number;
  pieceImageStyle: ImageStyle;
  legalMoveStyle: ViewStyle;
  legalCaptureStyle: ViewStyle;
  onPress: () => void;
}

// Клетка доски — обёрнута в memo, чтобы при ходе перерисовывались только
// изменившиеся клетки, а не вся доска целиком (устраняет мигание PNG-текстур)
const Cell = memo(function Cell({
  square,
  isLight,
  pieceKey,
  isAttackPiece,
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
  isJustMoved,
  cellStyle,
  cellSize,
  pieceSize,
  pieceImageStyle,
  legalMoveStyle,
  legalCaptureStyle,
  onPress,
}: CellProps) {
  return (
    <TouchableOpacity
      testID={`square-${square}`}
      style={[styles.cell, cellStyle]}
      onPress={onPress}
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
      {pieceKey && (
        isSpawned
          ? <SpawnedPieceView key={`${square}-spawned`} pieceKey={pieceKey} useAttackImage={isAttackPiece} pieceSize={pieceSize} pieceImageStyle={pieceImageStyle} />
          : <PieceView key={isJustMoved ? `${square}-moved` : square} pieceKey={pieceKey} useAttackImage={isAttackPiece} pieceSize={pieceSize} pieceImageStyle={pieceImageStyle} />
      )}
    </TouchableOpacity>
  );
});

export function ChessBoard({ chess, playerColor = 'w', onMove, disabled = false, highlightSquare, opponentLastMove, upgradeHighlights, spawnedSquare, forcedSquares, forcedMoves, lastMoveHighlight, attackSquares, size }: ChessBoardProps) {
  const { theme } = useChapterTheme();
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // Анимация плавного перемещения фигуры (sliding) — слой поверх доски, см. usePieceAnimation
  const { animX, animY, animateMove, isAnimating } = usePieceAnimation();
  const [animatingSquares, setAnimatingSquares] = useState<{ from: Square; to: Square } | null>(null);
  const [animatingPieceKey, setAnimatingPieceKey] = useState<PieceKey | null>(null);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = playerColor === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const orderedFiles = playerColor === 'w' ? files : [...files].reverse();
  const flipped = playerColor !== 'w';

  // Размер доски передаётся пропсом (адаптивная вёрстка экрана боя) либо берётся
  // из BOARD_SIZE по умолчанию (вызовы без size — обычные режимы)
  const boardSize = size ?? BOARD_SIZE;
  const cellSize = boardSize / 8;
  const pieceSize = cellSize * 0.88;

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
      if (disabled || isAnimating.current) return;
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

      // Сначала проигрываем анимацию слайда «призрака» из selectedSquare в square,
      // chess.move() и onMove вызываются только после её завершения (onComplete)
      const movingPiece = chess.get(selectedSquare);
      const from = selectedSquare;
      const to = square;
      if (movingPiece) {
        const pieceKey = `${movingPiece.color}${movingPiece.type.toUpperCase()}` as PieceKey;
        setAnimatingSquares({ from, to });
        setAnimatingPieceKey(pieceKey);
        animateMove(
          { piece: pieceKey, from: squareToCoords(from, flipped), to: squareToCoords(to, flipped) },
          cellSize,
          () => {
            setAnimatingSquares(null);
            setAnimatingPieceKey(null);
            const result = attemptMove(chess, from, to, 'q');
            if (result.success && result.move) {
              setLastMove({ from, to });
              onMove?.(result);
            }
          }
        );
      }

      setSelectedSquare(null);
      setLegalTargets([]);
    },
    [chess, selectedSquare, playerColor, disabled, onMove, isSquareForced, filterForcedTargets, isMoveForced, isAnimating, animateMove, flipped, cellSize]
  );

  // Анимация хода ИИ: к моменту ререндера chess.move() уже применён (фигура стоит на `to`),
  // поэтому проигрываем slide из `from` в `to`, скрывая реальную фигуру на `to` до конца анимации
  useEffect(() => {
    if (!lastMoveHighlight || lastMoveHighlight.color !== 'opponent') return;
    const { from, to } = lastMoveHighlight;
    const piece = chess.get(to);
    if (!piece) return;
    const pieceKey = `${piece.color}${piece.type.toUpperCase()}` as PieceKey;
    setAnimatingSquares({ from, to });
    setAnimatingPieceKey(pieceKey);
    animateMove(
      { piece: pieceKey, from: squareToCoords(from, flipped), to: squareToCoords(to, flipped) },
      cellSize,
      () => {
        setAnimatingSquares(null);
        setAnimatingPieceKey(null);
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMoveHighlight]);

  const board = chess.board();

  const dynamicStyles = useMemo(() => ({
    container: { width: boardSize, height: boardSize },
    cell: { width: cellSize, height: cellSize },
    pieceImage: { width: pieceSize, height: pieceSize },
    legalMove: { width: cellSize * 0.3, height: cellSize * 0.3 },
    legalCapture: {
      width: cellSize * 0.9,
      height: cellSize * 0.9,
      borderWidth: cellSize * 0.1,
      borderRadius: cellSize * 0.5,
    },
  }), [boardSize, cellSize, pieceSize]);

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
            const isJustMoved = square === lastMove?.to;
            const isOpponentLastMove = opponentLastMove?.from === square || opponentLastMove?.to === square;
            const upgradeHighlight = upgradeHighlights?.find(h => h.square === square);
            const isForcedSquare = !!forcedSquares && forcedSquares.includes(square);
            const isLastMoveHighlightSquare = lastMoveHighlight?.from === square || lastMoveHighlight?.to === square;

            // На время анимации слайда скрываем реальную фигуру на исходной и целевой
            // клетках — виден только анимированный «призрак» (animationLayer ниже)
            const isAnimatingSquare = animatingSquares?.from === square || animatingSquares?.to === square;
            const pieceKey = cell && !isAnimatingSquare
              ? (`${cell.color}${cell.type.toUpperCase()}` as PieceKey)
              : null;
            const isAttackPiece = !!pieceKey && !!attackSquares?.includes(square);

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
                isAttackPiece={isAttackPiece}
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
                isJustMoved={isJustMoved}
                cellStyle={dynamicStyles.cell}
                cellSize={cellSize}
                pieceSize={pieceSize}
                pieceImageStyle={dynamicStyles.pieceImage}
                legalMoveStyle={dynamicStyles.legalMove}
                legalCaptureStyle={dynamicStyles.legalCapture}
                onPress={() => handleSquarePress(square)}
              />
            );
          })}
        </View>
      ))}
      {animatingPieceKey && (
        <View style={[styles.animationLayer, dynamicStyles.container]} pointerEvents="none">
          <Animated.View
            style={[
              styles.animationPiece,
              { width: cellSize, height: cellSize, transform: [{ translateX: animX }, { translateY: animY }] },
            ]}
          >
            <ChessPiece pieceKey={animatingPieceKey} size={pieceSize} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    borderWidth: 2,
    borderColor: '#3a3060',
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    // Заполняет субпиксельные зазоры между клетками на физических iOS-устройствах
    backgroundColor: '#4a4a80',
  },
  row: {
    flexDirection: 'row',
  },
  animationLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  animationPiece: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
});
