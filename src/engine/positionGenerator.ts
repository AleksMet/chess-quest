import { Chess } from 'chess.js';

// Curated middlegame FENs: 8-10 pieces per side, balanced material, no check
const QUICK_BATTLE_POSITIONS: string[] = [
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
  'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
  'rnbqk2r/pp2bppp/2p1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6',
  'r2q1rk1/ppp1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 2 8',
  'r1bqr1k1/pp2bppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R1BQ1RK1 w - - 4 9',
  'r1b2rk1/ppq1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPPQ1PPP/R1B2RK1 w - - 6 10',
  'r4rk1/pp1nqppp/2pb1n2/4p3/4P3/1NNP1B2/PPP1QPPP/R4RK1 w - - 0 12',
  'r2q1rk1/1pp1bppp/p1np1n2/4p3/4P3/1NNP1B2/PPP1QPPP/R3KR1 w Q - 2 11',
  'r1bq1rk1/pp3ppp/2n2n2/3pp3/1bB1P3/2NP1N2/PPP1QPPP/R1B2RK1 w - - 2 9',
  'r2qr1k1/ppp1bppp/2n2n2/4p3/2B1P3/2N2N2/PPP1QPPP/R1B2RK1 w - - 4 10',
  '2rq1rk1/pp2bppp/2np1n2/4p3/4P3/2NP1NB1/PPP1BPPP/R2Q1RK1 w - - 0 11',
  'r1bqr1k1/1pp2ppp/p1np1n2/2b1p3/2B1P3/P1NP1N2/1PP1QPPP/R1B2RK1 w - - 2 9',
];

// Ambush positions: player (white) is down 2-3 pieces
const AMBUSH_POSITIONS: string[] = [
  'r1bq1rk1/ppp1bppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQ - 0 8',
  'r2q1rk1/ppp1bppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R1BQ1K1R w - - 0 9',
  'r1bqr1k1/ppp2ppp/2np1n2/4p3/4P3/2NPbN2/PPP1BPPP/R1BQK2R w KQ - 0 8',
  'r2qr1k1/pp2bppp/2np1n2/4p3/3PP3/2N2N2/PPP1BPPP/R1BQ1K1R w - - 0 10',
  'r1bq1rk1/pp3ppp/2np1n2/4p3/4P3/2NP1N2/PPP1bPPP/R1BQK2R w KQ - 0 9',
];

export function generateQuickBattlePosition(): string {
  const idx = Math.floor(Math.random() * QUICK_BATTLE_POSITIONS.length);
  return QUICK_BATTLE_POSITIONS[idx];
}

export function generateAmbushPosition(): string {
  const idx = Math.floor(Math.random() * AMBUSH_POSITIONS.length);
  return AMBUSH_POSITIONS[idx];
}

/** Count material value for one side. Q=9 R=5 B=3 N=3 P=1 */
export function countMaterial(chess: Chess, color: 'w' | 'b'): number {
  const VALUES: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
  let total = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.color === color) total += VALUES[sq.type] ?? 0;
    }
  }
  return total;
}
