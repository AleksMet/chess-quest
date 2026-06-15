import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { PieceKey } from './ChessPieceSVG';
import { PIECE_SVG_STRINGS } from '../../data/pieceSvgStrings';

interface ChessPieceProps {
  pieceKey: PieceKey;
  size: number;
}

// React.memo, чтобы фигура не перерисовывалась, если её клетка и размер не изменились
// (устраняет мигание SVG при перерендере доски).
export const ChessPiece = memo(function ChessPiece({ pieceKey, size }: ChessPieceProps) {
  const squareSize = size;
  const pieceSize = size;
  const offset = 0;

  return (
    <View style={{ width: squareSize, height: squareSize }}>
      <SvgXml
        xml={PIECE_SVG_STRINGS[pieceKey]}
        width={pieceSize}
        height={pieceSize}
        style={{ position: 'absolute', top: offset, left: offset }}
      />
    </View>
  );
}, (prev, next) => prev.pieceKey === next.pieceKey && prev.size === next.size);
