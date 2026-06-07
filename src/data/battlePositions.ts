// FEN позиции для быстрых боёв.
// Все проверены через chess.js. Белые и чёрные имеют разный состав (асимметрия).

// Быстрый бой: разный материал и структура у сторон
export const QUICK_BATTLE_POSITIONS: string[] = [
  // Белые сильнее по качеству, чёрные — по количеству пешек
  'r1b2rk1/pp3ppp/2np4/4p3/2B1n3/2N2N2/PPP2PPP/R1B2RK1 w - - 0 1',
  // Белые имеют ферзя, чёрные — две ладьи
  '2r1r1k1/pp3ppp/2np1n2/4p3/4P3/2NP1N2/PPP2PPP/3QK2R w K - 0 1',
  // Белые без ферзя, чёрные с ферзём на другом фланге
  'r4rk1/pp1qbppp/2np1n2/4p3/4P3/2NP1N2/PPP1BPPP/R4RK1 w - - 0 1',
  // Эндшпиль: белые ладья + конь, чёрные слон + пешечное большинство
  '6k1/pp1b1ppp/8/3p4/3P4/2N5/PP3PPP/5RK1 w - - 0 1',
  // Белые с двумя слонами, чёрные с ладьёй и пешечным центром
  '3r2k1/pp3ppp/2p2n2/4p3/4P3/2P5/PP1BBPPP/4RK2 w - - 0 1',
  // Белые с дополнительной пешкой, чёрные активнее по фигурам
  '2rq1rk1/pb3ppp/1pnp1n2/4p3/4P3/2NP1N2/PPP1BPPP/R2Q1RK1 w - - 0 1',
  // Миттельшпиль: у белых ладья за двух слонов
  '2b2rk1/pp3ppp/2np1n2/4p3/4P3/2NP4/PPP1BPPP/R4RK1 w - - 0 1',
  // Белые с конём за слона, чёрные имеют пару слонов
  '2b1b1k1/pp3ppp/2np1n2/4p3/4P3/2NP1N2/PPP2PPP/R1B2RK1 w - - 0 1',
  // Эндшпиль ферзь против двух ладей
  '3r1rk1/pp3ppp/8/4p3/4P3/8/PPP2PPP/3Q1RK1 w - - 0 1',
  // Белые опережают в развитии, чёрные с лишней пешкой
  '1nbqk2r/ppp2ppp/3p1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQk - 0 1',
  // Белые с изолированной пешкой d, чёрные пешечное большинство на ферзевом фланге
  'r2q1rk1/pb3ppp/1pnp1n2/4p3/3PP3/2N1BN2/PPP2PPP/R2Q1RK1 w - - 0 1',
  // Белые с активными ладьями, чёрные с конями в центре
  '2r3k1/pp1b1ppp/3p4/4n3/4N3/3P4/PPP1BPPP/2R3K1 w - - 0 1',
];

// Пред-боссовые позиции (этаж 3, quick_battle): более насыщенные
export const PRE_BOSS_POSITIONS: string[] = [
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

// Позиции для режима «Часы»: активный миттельшпиль/эндшпиль, 6-8 фигур (с пешками) на сторону
// Все проверены через chess.js: ход белых, без шаха, есть ходы.
export const CLOCK_POSITIONS: string[] = [
  '2k5/2r5/p5p1/4p2p/3P1P1r/1BPn4/4BR2/6K1 w - - 0 1',
  '6k1/3r2p1/B2q1p1p/P7/PP3B2/2n3RP/8/6K1 w - - 0 1',
  '2k5/n7/1R1p1r2/2p1P1R1/1np2P1p/7P/N3P3/6K1 w - - 0 1',
  '6k1/p7/1q4p1/2RP4/P1B1Bp1n/2bP3P/8/6K1 w - - 0 1',
  '2k5/8/1r3p2/3r4/1P3pPp/QP2n2B/4N3/2K5 w - - 0 1',
  '2k5/2b2n2/1p4p1/q3NP1R/2pR4/P7/5P2/6K1 w - - 0 1',
  '2k5/3pb3/2p5/1rPP1Q2/1bp5/3NP1B1/7P/6K1 w - - 0 1',
  '6k1/2p1p1p1/6b1/2B1r3/p2N2Qb/2PP3P/8/2K5 w - - 0 1',
  '2k5/8/N5pp/1P1nn3/1rp1P2P/1B4P1/4R3/6K1 w - - 0 1',
  '6k1/7r/R1p2p2/2n5/1pnpBP1B/P7/P7/6K1 w - - 0 1',
  '6k1/6b1/3Qb1p1/NP1Br2p/3pP3/6PP/8/2K5 w - - 0 1',
  '6k1/8/1Nb2BpR/1np4P/q5p1/1P6/P4P2/6K1 w - - 0 1',
];
