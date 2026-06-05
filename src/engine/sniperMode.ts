import { Chess } from 'chess.js';
import type { Square } from 'chess.js';

interface TargetConfig {
  types: string[];
  moveLimit: number;
}

const FLOOR_CONFIGS: TargetConfig[] = [
  { types: ['p'],        moveLimit: 20 }, // floor 0 — pawn target
  { types: ['p', 'n'],   moveLimit: 18 }, // floor 1
  { types: ['n', 'b'],   moveLimit: 15 }, // floor 2
  { types: ['r', 'n'],   moveLimit: 15 }, // floor 3 — rook or knight
  { types: ['r', 'q'],   moveLimit: 12 }, // floor 4
];

function configForFloor(floorIndex: number): TargetConfig {
  return FLOOR_CONFIGS[Math.min(floorIndex, FLOOR_CONFIGS.length - 1)];
}

export function selectSniperTarget(fen: string, floorIndex: number): Square | null {
  try {
    const chess = new Chess(fen);
    const { types } = configForFloor(floorIndex);
    const board = chess.board();

    const candidates: Square[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        // Target black pieces that match the allowed types
        if (piece && piece.color === 'b' && types.includes(piece.type)) {
          const file = String.fromCharCode('a'.charCodeAt(0) + f);
          const rank = String(8 - r);
          candidates.push(`${file}${rank}` as Square);
        }
      }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch {
    return null;
  }
}

export function getSniperMoveLimit(floorIndex: number): number {
  return configForFloor(floorIndex).moveLimit;
}
