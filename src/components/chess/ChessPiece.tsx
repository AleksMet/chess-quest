import { SvgXml } from 'react-native-svg';
import type { PieceKey } from './ChessPieceSVG';
import { PIECE_SVG_XML } from './pieceSvgXml';

interface ChessPieceProps {
  pieceKey: PieceKey;
  size: number;
}

export function ChessPiece({ pieceKey, size }: ChessPieceProps) {
  return <SvgXml xml={PIECE_SVG_XML[pieceKey]} width={size} height={size} />;
}
