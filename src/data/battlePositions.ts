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
