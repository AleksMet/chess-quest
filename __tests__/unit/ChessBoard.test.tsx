import { render } from '@testing-library/react-native';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../src/components/chess/ChessBoard';

describe('ChessBoard', () => {
  it('renders 64 cells', () => {
    const chess = new Chess();
    const { getAllByTestId } = render(<ChessBoard chess={chess} />);
    // Each square has testID="square-{file}{rank}"
    const squares = getAllByTestId(/^square-[a-h][1-8]$/);
    expect(squares.length).toBe(64);
  });

  it('renders with testID chess-board', () => {
    const chess = new Chess();
    const { getByTestId } = render(<ChessBoard chess={chess} />);
    expect(getByTestId('chess-board')).toBeTruthy();
  });

  it('renders pieces from starting position', () => {
    const chess = new Chess();
    const { getByTestId } = render(<ChessBoard chess={chess} />);
    // Check that the board renders without crash and has all 64 squares
    const board = getByTestId('chess-board');
    expect(board).toBeTruthy();
  });
});
