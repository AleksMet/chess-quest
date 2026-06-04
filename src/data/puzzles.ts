export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];   // correct UCI moves in sequence
  rating: number;
  themes: string[];
}

// 50 Lichess-style puzzles, Chapter 1: rating 800-1100, themes: fork, pin, mate
// FEN is position BEFORE the first correct move; side to move is the player
export const CHAPTER_1_PUZZLES: Puzzle[] = [
  // ─── FORKS (knight/queen) ───────────────────────────────────────────────────
  { id: 'p001', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves: ['f3g5'], rating: 850, themes: ['fork'] },
  { id: 'p002', fen: 'r1b1kbnr/ppppqppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4', moves: ['f3g5', 'e7g5', 'c4f7'], rating: 900, themes: ['fork', 'mate'] },
  { id: 'p003', fen: '5rk1/pp3ppp/2p5/8/3Pn3/P1P5/1P3PPP/R3R1K1 b - - 0 1', moves: ['e4c3', 'b2c3', 'f8e8'], rating: 920, themes: ['fork'] },
  { id: 'p004', fen: 'r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 1 4', moves: ['c6d4', 'f3d4', 'e5d4'], rating: 870, themes: ['fork'] },
  { id: 'p005', fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1', moves: ['c3d5', 'f6d5', 'c4d5'], rating: 950, themes: ['fork'] },
  { id: 'p006', fen: '2k5/pp3ppp/2p5/8/3Nn3/8/PPP2PPP/2K5 b - - 0 1', moves: ['e4c3', 'c1d1', 'c3a2'], rating: 880, themes: ['fork'] },
  { id: 'p007', fen: 'r2qk2r/ppp1bppp/2n2n2/3pp3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 0 1', moves: ['c3d5', 'f6d5', 'e4d5'], rating: 910, themes: ['fork'] },
  { id: 'p008', fen: 'r1bqkb1r/ppp2ppp/2n2n2/3pp3/4P3/2N2N2/PPPPBPPP/R1BQK2R w KQkq - 0 1', moves: ['c3d5', 'f6d5', 'e4d5'], rating: 840, themes: ['fork'] },
  { id: 'p009', fen: '4k3/pp3ppp/8/1n6/8/8/PP3PPP/2KR4 w - - 0 1', moves: ['d1d8'], rating: 800, themes: ['fork', 'mate'] },
  { id: 'p010', fen: 'r1bq1rk1/ppp2ppp/2np1n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1', moves: ['c3d5', 'f6d5', 'c4d5'], rating: 930, themes: ['fork'] },

  // ─── PINS ───────────────────────────────────────────────────────────────────
  { id: 'p011', fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves: ['f3g5'], rating: 860, themes: ['pin'] },
  { id: 'p012', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves: ['b2b4', 'c5b4', 'c2c3'], rating: 900, themes: ['pin'] },
  { id: 'p013', fen: 'r2qkb1r/ppp1nppp/3p1n2/4p1B1/3PP3/2N5/PPP2PPP/R2QKB1R w KQkq - 0 1', moves: ['g5f6', 'e7f6', 'd4e5'], rating: 950, themes: ['pin'] },
  { id: 'p014', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 2 5', moves: ['c4b5'], rating: 870, themes: ['pin'] },
  { id: 'p015', fen: 'r1bqk1nr/pppp1ppp/2n5/8/1bBpP3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 5', moves: ['e1f1', 'b4c3', 'b2c3'], rating: 920, themes: ['pin'] },
  { id: 'p016', fen: 'r1bq1rk1/ppppbppp/2n2n2/4p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQ - 0 1', moves: ['f1b5'], rating: 840, themes: ['pin'] },
  { id: 'p017', fen: 'r1bqk2r/pp1p1ppp/2n1pn2/2p5/1bPP4/2NBPN2/PP3PPP/R1BQK2R w KQkq - 0 1', moves: ['e3c5'], rating: 960, themes: ['pin'] },
  { id: 'p018', fen: '2bqk2r/r4ppp/p1n1pn2/1ppPp3/4P3/2PB1N2/PP3PPP/RNBQ1RK1 w k - 0 1', moves: ['d3h7', 'e8h7', 'f3g5', 'h7g8', 'd1h5'], rating: 1050, themes: ['pin', 'mate'] },
  { id: 'p019', fen: 'r2qkb1r/pp1b1ppp/2n1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R b KQkq - 0 1', moves: ['d5c4', 'd3c4', 'e6e5'], rating: 890, themes: ['pin'] },
  { id: 'p020', fen: 'r1bqk1nr/pp1p1ppp/2n1p3/2p5/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1', moves: ['c4b5'], rating: 830, themes: ['pin'] },

  // ─── MATE IN 1-2 ────────────────────────────────────────────────────────────
  { id: 'p021', fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', moves: ['e1e8'], rating: 800, themes: ['mate', 'mateIn1'] },
  { id: 'p022', fen: 'r5k1/pp4pp/2p5/8/8/2P5/PP4PP/4R2K w - - 0 1', moves: ['e1e8'], rating: 800, themes: ['mate', 'mateIn1'] },
  { id: 'p023', fen: '6k1/ppR2ppp/8/8/8/8/PPP2PPP/6K1 w - - 0 1', moves: ['c7c8'], rating: 810, themes: ['mate', 'mateIn1'] },
  { id: 'p024', fen: 'r6k/pp4Rp/6p1/8/8/8/PP4PP/6K1 w - - 0 1', moves: ['g7h7'], rating: 820, themes: ['mate', 'mateIn1'] },
  { id: 'p025', fen: '5rk1/ppQ2ppp/8/8/8/8/PPP2PPP/6K1 w - - 0 1', moves: ['c7g7'], rating: 830, themes: ['mate', 'mateIn1'] },
  { id: 'p026', fen: '2r3k1/5ppp/8/8/8/8/5PPP/2Q3K1 w - - 0 1', moves: ['c1c8', 'c8c8', 'g1g2'], rating: 850, themes: ['mate', 'mateIn2'] },
  { id: 'p027', fen: 'r1b2rk1/pp2qppp/2np1n2/2p1p3/4P3/2NP1NBP/PPP2PP1/R1BQR1K1 b - - 0 1', moves: ['e7h4', 'h3h4', 'f6g4'], rating: 980, themes: ['mate', 'mateIn2'] },
  { id: 'p028', fen: '2k5/p1p5/1p3R2/8/8/8/PPP5/2K5 w - - 0 1', moves: ['f6f8'], rating: 820, themes: ['mate', 'mateIn1'] },
  { id: 'p029', fen: '7k/6Q1/5K2/8/8/8/8/8 w - - 0 1', moves: ['g7h7'], rating: 800, themes: ['mate', 'mateIn1'] },
  { id: 'p030', fen: '4r1k1/pp3ppp/2p5/8/8/2P5/PP3PPP/4R1K1 w - - 0 1', moves: ['e1e8', 'e8e8', 'g1g2'], rating: 840, themes: ['mate', 'mateIn2'] },

  // ─── FORK + MATE MIX ────────────────────────────────────────────────────────
  { id: 'p031', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPPQPPP/RNB1KB1R w KQkq - 4 4', moves: ['e2e5', 'c6e5', 'f3e5'], rating: 870, themes: ['fork'] },
  { id: 'p032', fen: 'r1bq1rk1/pp3ppp/2n5/3pp3/1bBnP3/2N2N2/PPPPBPPP/R1BQK2R w KQ - 0 1', moves: ['c3d5', 'd4f3', 'e2f3'], rating: 1000, themes: ['fork', 'pin'] },
  { id: 'p033', fen: '2kr1b1r/ppp2ppp/2nqpn2/3p4/2B5/2NP1N2/PPP1QPPP/R1B1K2R w KQ - 0 1', moves: ['c3d5'], rating: 960, themes: ['fork'] },
  { id: 'p034', fen: 'r1b1k2r/pp2qppp/2npbn2/4p3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 0 1', moves: ['f3g5', 'f6g5', 'c3d5'], rating: 990, themes: ['fork', 'pin'] },
  { id: 'p035', fen: 'rnb1k2r/pp3ppp/4pn2/2pp4/1bBP4/2N1PN2/PPP2PPP/R1BQK2R w KQkq - 0 1', moves: ['e3d4', 'b4c3', 'b2c3'], rating: 920, themes: ['pin'] },
  { id: 'p036', fen: 'r2q1rk1/ppp1bppp/2n2n2/4p3/4P3/2N2N2/PPPPBPPP/R1BQ1RK1 w - - 0 1', moves: ['c3d5', 'f6d5', 'e4d5'], rating: 940, themes: ['fork'] },
  { id: 'p037', fen: 'r1b2rk1/ppp1qppp/2np1n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w - - 4 8', moves: ['c3d5', 'f6d5', 'c4d5'], rating: 960, themes: ['fork'] },
  { id: 'p038', fen: '2r2rk1/pp2qppp/2np1n2/4p3/4P3/2NP1N2/PPP1QPPP/R1B2RK1 w - - 0 1', moves: ['c3d5', 'f6d5', 'e4d5'], rating: 970, themes: ['fork'] },
  { id: 'p039', fen: 'r1bqr1k1/pp2bppp/2np1n2/4p3/4P3/2NP1N2/PPPQBPPP/R1B2RK1 w - - 0 1', moves: ['c3d5', 'e7d6', 'd5c7'], rating: 1010, themes: ['fork'] },
  { id: 'p040', fen: 'r2q1rk1/pp1bbppp/2np1n2/4p3/4P3/2NP1NB1/PPP1BPPP/R2Q1RK1 w - - 0 1', moves: ['g3d6'], rating: 950, themes: ['pin'] },

  // ─── INTERMEDIATE (1000-1100) ────────────────────────────────────────────────
  { id: 'p041', fen: 'r1b1r1k1/pp3ppp/2np1n2/q3p3/4P3/2NP1N2/PPP1BPPP/R1BQR1K1 w - - 0 1', moves: ['c3d5', 'a5d2', 'd5f6', 'g7f6', 'd1d2'], rating: 1050, themes: ['fork'] },
  { id: 'p042', fen: 'r3r1k1/pp2qppp/2np1n2/4pb2/4P3/2NPBN2/PPP1QPPP/R4RK1 w - - 0 1', moves: ['e3f4', 'e5f4', 'c3d5'], rating: 1070, themes: ['fork', 'pin'] },
  { id: 'p043', fen: 'r2q1rk1/pp2bppp/2n2n2/3pp3/4P3/2NP1N2/PPP1BPPP/R2Q1RK1 b - - 0 1', moves: ['d5d4', 'c3e2', 'e5e4'], rating: 1080, themes: ['fork'] },
  { id: 'p044', fen: '2rq1rk1/pp2bppp/2np1n2/4p3/4P3/1NNP1NB1/PPP1BPPP/R2Q1RK1 b - - 0 1', moves: ['c6d4', 'c3d4', 'e5d4'], rating: 1060, themes: ['fork'] },
  { id: 'p045', fen: 'r2qr1k1/pp2bppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R2QR1K1 w - - 0 1', moves: ['c3d5', 'f6d5', 'e4d5'], rating: 1000, themes: ['fork'] },
  { id: 'p046', fen: 'r2q1rk1/p3bppp/2p2n2/1p2p3/4P3/1BNP1N2/PPP2PPP/R2Q1RK1 b - - 0 1', moves: ['f6e4', 'c3e4', 'd8d4'], rating: 1090, themes: ['fork'] },
  { id: 'p047', fen: 'r3r1k1/pp1qbppp/2n2n2/3pp3/3PP3/2N2N2/PPP1BPPP/R2Q1RK1 b - - 0 1', moves: ['d5d4', 'c3e2', 'e5e4'], rating: 1080, themes: ['fork'] },
  { id: 'p048', fen: 'r2q1rk1/1pp1bppp/p1np1n2/4p3/4P3/1NNP1N2/PPP1BPPP/R2Q1RK1 w - - 0 1', moves: ['c3d5', 'f6d5', 'b3d4'], rating: 1020, themes: ['fork'] },
  { id: 'p049', fen: 'r1b1r1k1/pp2bppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R1BQR1K1 w - - 0 1', moves: ['c3d5', 'f6d5', 'e4d5'], rating: 1030, themes: ['fork'] },
  { id: 'p050', fen: '2rqr1k1/pp2bppp/2np1n2/4p3/4P3/2NP1NB1/PPP1BPPP/R2Q1RK1 w - - 0 1', moves: ['c3d5', 'f6d5', 'e4d5'], rating: 1040, themes: ['fork'] },
];

export function getPuzzlesForChapter(chapterIndex: number): Puzzle[] {
  if (chapterIndex === 0) return CHAPTER_1_PUZZLES;
  return CHAPTER_1_PUZZLES; // fallback until more chapters added
}

export function getRandomPuzzle(chapterIndex: number): Puzzle {
  const pool = getPuzzlesForChapter(chapterIndex);
  return pool[Math.floor(Math.random() * pool.length)];
}
