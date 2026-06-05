// FEN positions for quick-battle floors.
// All verified legal via chess.js.

// Regular quick-battle: varied material, not full complement
export const QUICK_BATTLE_POSITIONS: string[] = [
  // ~10-12 pieces per side, middlegame
  'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7',
  'rnbqk2r/pp2bppp/2p1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6',
  'r2q1rk1/ppp1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 2 8',
  'r1bqr1k1/pp2bppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R1BQ1RK1 w - - 4 9',
  'r2q1rk1/1pp1bppp/p1np1n2/4p3/4P3/1NNP1B2/PPP1QPPP/R4RK1 w - - 0 12',
  'r1bq1rk1/pp3ppp/2n2n2/3pp3/1bB1P3/2NP1N2/PPP1QPPP/R1B2RK1 w - - 2 9',
  'r2qr1k1/ppp1bppp/2n2n2/4p3/2B1P3/2N2N2/PPP1QPPP/R1B2RK1 w - - 4 10',
  '2rq1rk1/pp2bppp/2np1n2/4p3/4P3/2NP1NB1/PPP1BPPP/R2Q1RK1 w - - 0 11',
  // Fewer pieces — endgame-ish
  '4r1k1/pp3ppp/2n5/3p4/3P4/2N5/PP3PPP/4R1K1 w - - 0 18',
  '2b1r1k1/pp3ppp/2p2n2/3p4/3P4/2P2N2/PP3PPP/2B1R1K1 w - - 0 15',
  'r4rk1/pp1nqppp/2pb1n2/4p3/4P3/1NNP1B2/PPP1QPPP/R4RK1 w - - 0 12',
  'r2q1rk1/ppp1nppp/1bn1p3/3pN3/3P1B2/2N1P3/PPP2PPP/R2QKB1R w KQ - 4 9',
];

// Pre-boss quick-battle (floor 5): full complement of pieces per side, rich middlegame
export const PRE_BOSS_POSITIONS: string[] = [
  // All 16 pieces per side still present (or nearly)
  'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
  'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 4 5',
  'rnbqk2r/ppp1bppp/3ppn2/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R w KQkq - 0 6',
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 2 4',
  'rnbq1rk1/ppp1bppp/3ppn2/8/2PPP3/2N1BN2/PP3PPP/R2QKB1R w KQ - 2 7',
  'r1bqk2r/ppp2ppp/2npbn2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 6',
  'rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R w KQkq - 2 6',
  'r1bqk2r/ppppbppp/2n2n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 2 5',
  'rnbqkb1r/ppp2ppp/3p1n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 0 5',
];
