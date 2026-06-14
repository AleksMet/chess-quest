import { memo } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import type { PieceKey } from './ChessPieceSVG';

// PNG-версии фигур (Cburnett, перекрашены) — лежат в src/assets/pieces/
import wK from '../../assets/pieces/wK.png';
import wQ from '../../assets/pieces/wQ.png';
import wR from '../../assets/pieces/wR.png';
import wB from '../../assets/pieces/wB.png';
import wN from '../../assets/pieces/wN.png';
import wP from '../../assets/pieces/wP.png';
import bK from '../../assets/pieces/bK.png';
import bQ from '../../assets/pieces/bQ.png';
import bR from '../../assets/pieces/bR.png';
import bB from '../../assets/pieces/bB.png';
import bN from '../../assets/pieces/bN.png';
import bP from '../../assets/pieces/bP.png';

interface ChessPieceProps {
  pieceKey: PieceKey;
  size: number;
}

const PIECE_IMAGES: Record<PieceKey, ImageSourcePropType> = {
  wK, wQ, wR, wB, wN, wP,
  bK, bQ, bR, bB, bN, bP,
};

// Фигура занимает 82% клетки, с отступом ~9% с каждой стороны — center-объект внутри клетки
const PIECE_SCALE = 0.82;
const PIECE_OFFSET = (1 - PIECE_SCALE) / 2;

// React.memo, чтобы фигура не перерисовывалась, если её клетка и размер не изменились
// (устраняет мигание Image при перерендере доски).
export const ChessPiece = memo(function ChessPiece({ pieceKey, size }: ChessPieceProps) {
  const squareSize = size;
  const pieceSize = squareSize * PIECE_SCALE;
  const offset = squareSize * PIECE_OFFSET;

  return (
    <View style={{ width: squareSize, height: squareSize }}>
      <Image
        source={PIECE_IMAGES[pieceKey]}
        style={{ position: 'absolute', top: offset, left: offset, width: pieceSize, height: pieceSize }}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
}, (prev, next) => prev.pieceKey === next.pieceKey && prev.size === next.size);
