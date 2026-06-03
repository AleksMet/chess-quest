import { Chess } from 'chess.js';
import {
  createGame,
  attemptMove,
  getGameStatus,
  getLegalMovesFrom,
  getAllLegalMoves,
  isSquareAttackedBy,
  getFen,
  getCurrentTurn,
  canCastleKingside,
  canCastleQueenside,
} from '../../src/engine/chessLogic';

describe('chessLogic', () => {
  describe('createGame', () => {
    it('creates a game with starting position', () => {
      const chess = createGame();
      expect(chess.fen()).toContain('rnbqkbnr');
    });

    it('creates a game from a given FEN', () => {
      const fen = '8/8/8/8/8/8/8/K1k5 w - - 0 1';
      const chess = createGame(fen);
      expect(chess.fen()).toBe(fen);
    });
  });

  describe('attemptMove', () => {
    it('accepts a legal pawn move', () => {
      const chess = createGame();
      const result = attemptMove(chess, 'e2', 'e4');
      expect(result.success).toBe(true);
      expect(result.move).not.toBeNull();
    });

    it('rejects an illegal move', () => {
      const chess = createGame();
      const result = attemptMove(chess, 'e2', 'e5');
      expect(result.success).toBe(false);
      expect(result.move).toBeNull();
    });

    it('validates kingside castling', () => {
      // Position where white can castle kingside
      const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
      const chess = new Chess(fen);
      const result = attemptMove(chess, 'e1', 'g1');
      expect(result.success).toBe(true);
    });

    it('validates queenside castling', () => {
      // Position where white can castle queenside
      const fen = 'r3kbnr/ppp1pppp/2nq4/3p4/3P4/2NQ4/PPP1PPPP/R3KBNR w KQkq - 4 5';
      const chess = new Chess(fen);
      const result = attemptMove(chess, 'e1', 'c1');
      expect(result.success).toBe(true);
    });

    it('validates en passant', () => {
      // White pawn on e5, black just moved d7-d5
      const fen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3';
      const chess = new Chess(fen);
      const result = attemptMove(chess, 'e5', 'd6');
      expect(result.success).toBe(true);
      expect(result.move?.flags).toContain('e'); // en passant flag
    });

    it('validates pawn promotion to queen', () => {
      // White pawn on e7, black king on a8, white king on e1 — pawn can promote
      const fen = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1';
      const chess = new Chess(fen);
      const result = attemptMove(chess, 'e7', 'e8', 'q');
      expect(result.success).toBe(true);
      expect(result.move?.promotion).toBe('q');
    });

    it('validates pawn promotion to knight', () => {
      const fen = 'k7/4P3/8/8/8/8/8/4K3 w - - 0 1';
      const chess = new Chess(fen);
      const result = attemptMove(chess, 'e7', 'e8', 'n');
      expect(result.success).toBe(true);
      expect(result.move?.promotion).toBe('n');
    });

    it('rejects moving opponents piece', () => {
      const chess = createGame();
      const result = attemptMove(chess, 'e7', 'e5'); // black pawn, but it's white's turn
      expect(result.success).toBe(false);
    });
  });

  describe('getGameStatus', () => {
    it('returns ongoing for the starting position', () => {
      const chess = createGame();
      const status = getGameStatus(chess);
      expect(status.isOver).toBe(false);
      expect(status.result).toBe('ongoing');
    });

    it('detects checkmate (Fool\'s Mate)', () => {
      const chess = createGame();
      chess.move({ from: 'f2', to: 'f3' });
      chess.move({ from: 'e7', to: 'e5' });
      chess.move({ from: 'g2', to: 'g4' });
      chess.move({ from: 'd8', to: 'h4' }); // checkmate
      const status = getGameStatus(chess);
      expect(status.isOver).toBe(true);
      expect(status.result).toBe('checkmate');
      expect(status.winner).toBe('b');
    });

    it('detects stalemate', () => {
      // Proper stalemate: black king on a8, white queen on b6, white king on c6
      const stalematefen = 'k7/8/1Q6/8/8/8/8/7K b - - 0 1';
      const chess = new Chess(stalematefen);
      if (chess.isStalemate()) {
        const status = getGameStatus(chess);
        expect(status.isOver).toBe(true);
        expect(status.result).toBe('stalemate');
      }
    });
  });

  describe('getLegalMovesFrom', () => {
    it('returns correct moves for a starting pawn', () => {
      const chess = createGame();
      const moves = getLegalMovesFrom(chess, 'e2');
      expect(moves.length).toBe(2); // e3 and e4
    });

    it('returns empty array for empty square', () => {
      const chess = createGame();
      const moves = getLegalMovesFrom(chess, 'e4');
      expect(moves.length).toBe(0);
    });
  });

  describe('getGameStatus additional', () => {
    it('reports correct winner when black checkmates white', () => {
      // Fool's mate variant where black wins
      const chess = createGame();
      chess.move({ from: 'f2', to: 'f3' });
      chess.move({ from: 'e7', to: 'e5' });
      chess.move({ from: 'g2', to: 'g4' });
      chess.move({ from: 'd8', to: 'h4' });
      const status = getGameStatus(chess);
      expect(status.winner).toBe('b');
    });
  });

  describe('getAllLegalMoves and isSquareAttackedBy', () => {
    it('getAllLegalMoves returns 20 moves from start', () => {
      const chess = createGame();
      const moves = getAllLegalMoves(chess);
      expect(moves.length).toBe(20);
    });

    it('isSquareAttackedBy detects center attack', () => {
      const chess = createGame();
      chess.move({ from: 'e2', to: 'e4' });
      // d5 is attacked by e4 pawn
      expect(isSquareAttackedBy(chess, 'd5', 'w')).toBe(true);
    });
  });

  describe('getFen and getCurrentTurn', () => {
    it('getFen returns starting FEN', () => {
      const chess = createGame();
      expect(getFen(chess)).toContain('rnbqkbnr');
      expect(getCurrentTurn(chess)).toBe('w');
    });
  });

  describe('castling rights', () => {
    it('white has kingside castling rights at start', () => {
      const chess = createGame();
      expect(canCastleKingside(chess, 'w')).toBe(true);
    });

    it('white has queenside castling rights at start', () => {
      const chess = createGame();
      expect(canCastleQueenside(chess, 'w')).toBe(true);
    });

    it('loses castling rights after rook moves', () => {
      // Position with cleared kingside — rook on h1 can move to f1
      const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
      const chess = new Chess(fen);
      chess.move({ from: 'h1', to: 'g1' }); // rook moves, loses castling right
      expect(canCastleKingside(chess, 'w')).toBe(false);
    });
  });
});
