// Chess piece SVGs — Cburnett style (CC BY-SA 3.0, lichess.org)
// viewBox: "0 0 45 45"
import Svg, { G, Path, Circle } from 'react-native-svg';

export type PieceKey =
  | 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP'
  | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP';

interface Props {
  pieceKey: PieceKey;
  size: number;
}

const WF = '#ffffff';
const WS = '#000000';
const BF = '#1a1a1a';
const BS = '#eeeeee';
const SW = '1.5';

interface PiecePartProps { f: string; s: string }

function Pawn({ f, s }: PiecePartProps) {
  return (
    <Path
      d="M 22,9 C 19.79,9 18,10.79 18,13 C 18,13.89 18.29,14.71 18.78,15.38 C 16.83,16.5 15.5,18.59 15.5,21 C 15.5,23.03 16.44,24.84 17.91,26.03 C 14.91,27.09 10.5,31.58 10.5,39.5 L 33.5,39.5 C 33.5,31.58 29.09,27.09 26.09,26.03 C 27.56,24.84 28.5,23.03 28.5,21 C 28.5,18.59 27.17,16.5 25.22,15.38 C 25.71,14.71 26,13.89 26,13 C 26,10.79 24.21,9 22,9 Z"
      fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"
    />
  );
}

function Rook({ f, s }: PiecePartProps) {
  return (
    <Path
      d="M 9,39 L 36,39 L 36,36 L 9,36 Z M 12,36 L 12,32 L 33,32 L 33,36 Z M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 Z M 34,14 L 31,17 L 14,17 L 11,14 Z M 14,17 L 14,32 L 31,32 L 31,17 Z"
      fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"
    />
  );
}

function Bishop({ f, s }: PiecePartProps) {
  return (
    <G fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 37.65,36.54 39,38 38,38.5 C 35,37.53 26,38.96 22.5,37.5 C 19,38.96 10,37.53 7,38.5 C 6,38 7.354,36.06 9,36 Z" />
      <Path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 L 27.5,25 L 22.5,25 L 22.5,26 C 20,27.5 20,30 20,30 C 19.5,30.5 20,32 15,32 Z" />
      <Path d="M 14,16.5 C 14,14 16,11 22.5,10.5 C 29,11 31,14 31,16.5 C 31,18.5 29.5,20.5 27.5,22 L 17.5,22 C 15.5,20.5 14,18.5 14,16.5 Z" />
      <Path d="M 25,8 C 25,8 27.5,11.5 22.5,10.5 C 17.5,11.5 20,8 20,8 C 21,6.5 22.5,6.5 22.5,6.5 C 24,6.5 25,8 25,8 Z" />
      <Path d="M 22.5,6.5 L 22.5,4" fill="none" />
      <Path d="M 20,5 L 25,5" fill="none" />
    </G>
  );
}

function Knight({ f, s, dark }: PiecePartProps & { dark?: boolean }) {
  const eye = dark ? WF : BF;
  const knightPath =
    'M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18 ' +
    'M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 ' +
    'C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 ' +
    'C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 ' +
    'C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10';
  return (
    <G>
      <Path d={knightPath} fill={f} stroke={s} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={knightPath} fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="25.5" r="0.75" fill={eye} stroke="none" />
      <Path
        d="M 15,15.5 A 0.5,1.5 0 1 1 14,15.5 A 0.5,1.5 0 1 1 15,15.5"
        fill={eye} stroke="none"
      />
    </G>
  );
}

function Queen({ f, s }: PiecePartProps) {
  return (
    <G fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 22.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 Z" />
      <Path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 Z" />
      <Path d="M 11.5,30 C 15,29 30,29 33.5,30" fill="none" />
      <Path d="M 12,33.5 C 15,32.5 30,32.5 33,33.5" fill="none" />
      <Path d="M 11,38.5 C 15,37.5 30,37.5 34,38.5" fill="none" />
      <Circle cx="6" cy="12" r="2" />
      <Circle cx="14" cy="9" r="2" />
      <Circle cx="22.5" cy="8" r="2" />
      <Circle cx="31" cy="9" r="2" />
      <Circle cx="39" cy="12" r="2" />
    </G>
  );
}

function King({ f, s }: PiecePartProps) {
  return (
    <G fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8" fill="none" />
      <Path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
      <Path d="M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 19.5,16 9.5,13 6.5,19.5 C 3.5,25.5 11.5,29.5 11.5,30 L 11.5,37 Z" />
      <Path d="M 11.5,30 C 17,27 27,27 32.5,30" fill="none" />
      <Path d="M 11.5,33.5 C 17,30.5 27,30.5 32.5,33.5" fill="none" />
      <Path d="M 11.5,37 C 17,34 27,34 32.5,37" fill="none" />
    </G>
  );
}

export function ChessPieceSVG({ pieceKey, size }: Props) {
  const isBlack = pieceKey[0] === 'b';
  const f = isBlack ? BF : WF;
  const s = isBlack ? BS : WS;
  const type = pieceKey[1] as 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      {type === 'P' && <Pawn f={f} s={s} />}
      {type === 'R' && <Rook f={f} s={s} />}
      {type === 'B' && <Bishop f={f} s={s} />}
      {type === 'N' && <Knight f={f} s={s} dark={isBlack} />}
      {type === 'Q' && <Queen f={f} s={s} />}
      {type === 'K' && <King f={f} s={s} />}
    </Svg>
  );
}
