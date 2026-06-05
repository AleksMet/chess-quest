import { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import type { Color } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import type { MoveResult } from '../../engine/chessLogic';
import { getRandomPuzzle } from '../../data/puzzles';
import { useRunStore } from '../../store/runStore';

const HINT_TIMEOUT_MS = 90_000;
const CORRECT_REWARD = 60;

export default function PuzzlePage() {
  const router = useRouter();
  const { chapterIndex, addScore, completeNode, currentNodeIndex, isActive } = useRunStore();

  const [puzzle] = useState(() => getRandomPuzzle(chapterIndex));
  const [chess] = useState(() => new Chess(puzzle.fen));
  const [boardKey, setBoardKey] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);    // which puzzle move we expect next
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [status, setStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isActive) { router.replace('/'); return null; }

  // Derive player color from whose turn it is in the puzzle FEN
  const playerColor: Color = puzzle.fen.split(' ')[1] === 'w' ? 'w' : 'b';

  const showHint = useCallback(() => {
    const expectedUCI = puzzle.moves[moveIndex];
    if (expectedUCI) {
      setHintSquare(expectedUCI.slice(0, 2));  // from-square of expected move
      setMessage('Подсказка: подсвечена нужная фигура');
    }
  }, [puzzle.moves, moveIndex]);

  useEffect(() => {
    if (status !== 'playing') return;
    timerRef.current = setTimeout(showHint, HINT_TIMEOUT_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [status, moveIndex, showHint]);

  function applyOpponentReply(uci: string) {
    const from = uci.slice(0, 2); const to = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | undefined;
    try { chess.move({ from, to, promotion }); } catch { /* ignore */ }
    setBoardKey(k => k + 1);
  }

  const handleMove = useCallback((result: MoveResult) => {
    if (!result.success || !result.move || status !== 'playing') return;

    const expectedUCI = puzzle.moves[moveIndex];
    const madeUCI = `${result.move.from}${result.move.to}${result.move.promotion ?? ''}`;
    const cleanExpected = expectedUCI.replace(/[^a-h1-8qrbn]/g, '');
    const cleanMade = madeUCI.replace(/[^a-h1-8qrbn]/g, '');

    if (cleanMade !== cleanExpected) {
      // Wrong move — undo, penalise, hint
      chess.undo();
      setBoardKey(k => k + 1);
      setAttempts(a => a + 1);
      setHintSquare(expectedUCI.slice(0, 2));
      setMessage(`Неверно! Попробуй ещё раз.`);
      return;
    }

    // Correct move
    setHintSquare(null);
    setMessage('');
    const nextMoveIndex = moveIndex + 1;

    // Apply opponent reply if it exists
    if (nextMoveIndex < puzzle.moves.length) {
      const opponentUCI = puzzle.moves[nextMoveIndex];
      setTimeout(() => {
        applyOpponentReply(opponentUCI);
        setMoveIndex(nextMoveIndex + 1);
      }, 400);
      setMoveIndex(nextMoveIndex);  // temporarily advance to show board
    } else {
      // Puzzle complete
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus('solved');
      setMessage(`Отлично! +${CORRECT_REWARD} 🎯`);
      addScore(CORRECT_REWARD);
      completeNode(currentNodeIndex);
    }
    setBoardKey(k => k + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveIndex, puzzle, status, chess]);

  function handleContinue() {
    router.replace('/adventure');
  }

  const boardDisabled = status !== 'playing';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>🧩 Тактическая задача</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {puzzle.rating}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.turn}>
          {playerColor === 'w' ? '⬜ Ход белых' : '⬛ Ход чёрных'}
        </Text>
        <Text style={styles.themes}>{puzzle.themes.join(' · ')}</Text>
      </View>

      {message !== '' && (
        <View style={[styles.messageBanner, status === 'solved' && styles.messageBannerGood]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <ChessBoard
        key={boardKey}
        chess={chess}
        playerColor={playerColor}
        onMove={handleMove}
        disabled={boardDisabled}
        highlightSquare={hintSquare ?? undefined}
      />

      <View style={styles.footer}>
        {status === 'playing' && attempts === 0 && (
          <Text style={styles.tip}>Найди лучший ход! Таймер: 90 сек → подсказка</Text>
        )}
        {status === 'playing' && attempts > 0 && (
          <Text style={styles.tip}>Попытка {attempts + 1} — подсвеченная фигура правильная</Text>
        )}
        {status === 'solved' && (
          <Pressable style={styles.continueBtn} onPress={handleContinue} testID="puzzle-continue">
            <Text style={styles.continueBtnText}>Продолжить →</Text>
          </Pressable>
        )}
        {status === 'failed' && (
          <Pressable style={[styles.continueBtn, styles.failBtn]} onPress={handleContinue} testID="puzzle-skip">
            <Text style={styles.continueBtnText}>Пропустить</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#0d1117' },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 10 },
  title:              { flex: 1, color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  ratingBadge:        { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText:         { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  info:               { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 },
  turn:               { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  themes:             { color: '#64748b', fontSize: 12 },
  messageBanner:      { marginHorizontal: 16, marginBottom: 6, backgroundColor: '#7f1d1d', borderRadius: 10, padding: 10 },
  messageBannerGood:  { backgroundColor: '#14532d' },
  messageText:        { color: '#fff', fontSize: 14, textAlign: 'center' },
  footer:             { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  tip:                { color: '#64748b', fontSize: 12, textAlign: 'center' },
  continueBtn:        { backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  failBtn:            { backgroundColor: '#64748b' },
  continueBtnText:    { color: '#fff', fontSize: 17, fontWeight: '800' },
});
