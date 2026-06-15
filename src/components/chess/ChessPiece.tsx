import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { PieceKey } from './ChessPieceSVG';
import { PIECE_SVG_XML } from './pieceSvgXml';

interface ChessPieceProps {
  pieceKey: PieceKey;
  size: number;
}

// Фигура занимает 82% клетки, с отступом ~9% с каждой стороны — center-объект внутри клетки
const PIECE_SCALE = 0.82;
const PIECE_OFFSET = (1 - PIECE_SCALE) / 2;

// React.memo, чтобы фигура не перерисовывалась, если её клетка и размер не изменились
// (устраняет мигание SVG при перерендере доски).
export const ChessPiece = memo(function ChessPiece({ pieceKey, size }: ChessPieceProps) {
  const squareSize = size;
  const pieceSize = squareSize * PIECE_SCALE;
  const offset = squareSize * PIECE_OFFSET;

  return (
    <View style={{ width: squareSize, height: squareSize }}>
      <SvgXml
        xml={PIECE_SVG_XML[pieceKey]}
        width={pieceSize}
        height={pieceSize}
        style={{ position: 'absolute', top: offset, left: offset }}
      />
    </View>
  );
}, (prev, next) => prev.pieceKey === next.pieceKey && prev.size === next.size);
