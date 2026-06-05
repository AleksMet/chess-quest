import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import { generateAmbushPosition, countMaterial } from '../../engine/positionGenerator';
import { processMove } from '../../engine/rewardEngine';
import { GoldPopup } from '../../components/ui/GoldPopup';
import { useRunStore } from '../../store/runStore';
import { HEROES } from '../../data/heroes';
import { eloToSkillLevel } from '../../engine/stockfish';
import type { RewardBreakdownItem } from '../../types';

const PLAYER_COLOR = 'w' as const;
const SURVIVE_MOVES = 10;
const GOLD_SURVIVE = 60;
const GOLD_SURVIVE_MULTIPLIER = 1.5;
const GOLD_CHECKMATE = 200;
const CAPTURE_VALUES: Record<string, number> = { p: 8, n: 25, b: 25, r: 40, q: 70, k: 0 };

export default function AmbushPage() {
  const router = useRouter();
  const { nodes, currentNodeIndex, heroId, artifacts, earnGold, completeNode, setCurrentFen, markKingChecked, isActive } = useRunStore();
  const hero = HEROES.find(h => h.id === heroId) ?? HEROES[0];

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = currentNode?.chapterElo ?? 550;
  const skillLevel = eloToSkillLevel(opponentElo);

  const [startFen] = useState(() => generateAmbushPosition());
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [result, setResult] = useState<'checkmate' | 'survive' | 'lose' | null>(null);
  const [opponentLastMove, setOpponentLastMove] = useState<{ from: string; to: string } | null>(null);
  const [materialInfo, setMaterialInfo] = useState(() => {
    const c = new Chess(startFen);
    return { player: countMaterial(c, 'w'), ai: countMaterial(c, 'b') };
  });
  const [popup, setPopup] = useState<{ total: number; breakdown: RewardBreakdownItem[] } | null>(null);

  const moveGoldRef = useRef(0);
  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isActive) { router.replace('/'); return null; }

  useEffect(() => () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); }, []);

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  function finishGame(r: 'checkmate' | 'survive' | 'lose') {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    setResult(r);
    setCurrentFen(chess.fen());

    const bonusGold = r === 'checkmate' ? GOLD_CHECKMATE : r === 'survive' ? Math.round(GOLD_SURVIVE * GOLD_SURVIVE_MULTIPLIER) : 0;
    if (r !== 'lose') {
      earnGold(moveGoldRef.current + bonusGold);
      // completeNode delegated to artifact-selection
    } else {
      completeNode(currentNodeIndex);
    }
  }

  const applyAIMove = useCallback((uci: string) => {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as 'q') ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }
      setOpponentLastMove({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      setBoardKey(k => k + 1);
      setIsAIThinking(false);
      setMaterialInfo({ player: countMaterial(chess, 'w'), ai: countMaterial(chess, 'b') });
      // Check if AI gave check to player
      if (chess.isCheck() && chess.turn() === PLAYER_COLOR) markKingChecked();
      if (chess.isCheckmate()) finishGame('lose');
      else if (chess.isDraw() || chess.isStalemate()) finishGame('survive');
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, markKingChecked]);

  const requestAIMove = useCallback(() => {
    if (chess.isGameOver() || chess.turn() === PLAYER_COLOR) return;
    setIsAIThinking(true);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      if (chess.turn() === PLAYER_COLOR || chess.isGameOver()) return;
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return;
      const m = moves[Math.floor(Math.random() * moves.length)];
      applyAIMove(`${m.from}${m.to}${m.promotion ?? ''}`);
    }, 1500);
    sendToEngine(`position fen ${chess.fen()}`);
    sendToEngine('go movetime 500');
  }, [chess, applyAIMove, sendToEngine]);

  const handleEngineMessage = useCallback((line: string) => {
    if (!line.startsWith('bestmove')) return;
    const uci = line.split(' ')[1];
    if (!uci || uci === '0000') { setIsAIThinking(false); return; }
    applyAIMove(uci);
  }, [applyAIMove]);

  useEffect(() => {
    if (engineReady && chess.turn() !== PLAYER_COLOR) requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  const handleMove = useCallback((moveResult: MoveResult) => {
    if (!moveResult.success || result !== null) return;
    setOpponentLastMove(null);
    const newCount = playerMoves + 1;
    setPlayerMoves(newCount);
    setMaterialInfo({ player: countMaterial(chess, 'w'), ai: countMaterial(chess, 'b') });

    // Reward engine
    const captureGold = moveResult.move?.captured ? (CAPTURE_VALUES[moveResult.move.captured] ?? 0) : 0;
    if (moveResult.move) {
      const reward = processMove({
        chess,
        move: moveResult.move,
        positionFenBefore: chess.fen(),
        goldBalance: moveGoldRef.current,
        artifacts,
        hero,
        moveNumber: newCount,
        playerColor: PLAYER_COLOR,
      });
      const moveGold = captureGold + reward.gold;
      if (moveGold > 0) {
        moveGoldRef.current += moveGold;
        const breakdown: RewardBreakdownItem[] = [];
        if (captureGold > 0) breakdown.push({ label: 'взятие', value: captureGold, type: 'base' });
        breakdown.push(...reward.breakdown);
        setPopup({ total: moveGold, breakdown });
      }
    }

    if (moveResult.isCheckmate) { finishGame('checkmate'); return; }
    if (moveResult.isDraw || moveResult.isStalemate) { finishGame('survive'); return; }
    if (newCount >= SURVIVE_MOVES) { finishGame('survive'); return; }

    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, result, requestAIMove, artifacts, hero]);

  function handleExit() {
    Alert.alert('Выйти из боя?', 'Прогресс потеряется.', [
      { text: 'Остаться', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => router.replace('/adventure') },
    ]);
  }

  const movesLeft = SURVIVE_MOVES - playerMoves;
  const boardDisabled = result !== null || isAIThinking || chess.turn() !== PLAYER_COLOR;

  const resultGoldText = result === 'checkmate'
    ? `+${GOLD_CHECKMATE + moveGoldRef.current} 💰`
    : result === 'survive'
      ? `+${Math.round(GOLD_SURVIVE * GOLD_SURVIVE_MULTIPLIER) + moveGoldRef.current} 💰`
      : moveGoldRef.current > 0 ? `+${moveGoldRef.current} 💰` : 'Продолжаешь путь...';

  return (
    <SafeAreaView style={styles.safe}>
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      <View style={styles.header}>
        <Text style={styles.title}>🕵️ Засада!</Text>
        <Pressable style={styles.exitBtn} onPress={handleExit} testID="exit-battle-btn">
          <Text style={styles.exitBtnText}>Выход</Text>
        </Pressable>
        <View style={styles.materialBadge}>
          <Text style={styles.materialText}>⚪{materialInfo.player} vs ⚫{materialInfo.ai}</Text>
        </View>
        {isAIThinking && <Text style={styles.thinking}>⏳</Text>}
      </View>

      <View style={styles.subheader}>
        <Text style={styles.goal}>
          Продержись {SURVIVE_MOVES} ходов (+{Math.round(GOLD_SURVIVE * GOLD_SURVIVE_MULTIPLIER)} 💰)
          или поставь мат (+{GOLD_CHECKMATE} 💰)
        </Text>
        <View style={[styles.moveBadge, movesLeft <= 3 && styles.moveBadgeUrgent]}>
          <Text style={styles.moveCount}>{movesLeft}</Text>
          <Text style={styles.moveLabel}>осталось</Text>
        </View>
      </View>

      <View style={styles.boardWrap}>
        <ChessBoard
          key={boardKey}
          chess={chess}
          playerColor={PLAYER_COLOR}
          onMove={handleMove}
          disabled={boardDisabled}
          opponentLastMove={opponentLastMove}
        />
        {popup && (
          <GoldPopup
            key={`popup_${moveGoldRef.current}`}
            total={popup.total}
            breakdown={popup.breakdown}
            onDone={() => setPopup(null)}
          />
        )}
      </View>

      {result && (
        <View style={styles.overlay}>
          <Text style={styles.resultEmoji}>
            {result === 'checkmate' ? '🏆' : result === 'survive' ? '🛡️' : '💀'}
          </Text>
          <Text style={styles.resultTitle}>
            {result === 'checkmate' ? 'Невозможный мат!' : result === 'survive' ? 'Выжил!' : 'Поражение'}
          </Text>
          <Text style={styles.resultGold}>{resultGoldText}</Text>
          <Pressable
            style={styles.continueBtn}
            onPress={() => result === 'lose' ? router.replace('/adventure') : router.replace('/artifact-selection')}
            testID="ambush-continue"
          >
            <Text style={styles.continueBtnText}>Продолжить</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#1a0a00' },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  title:            { flex: 1, color: '#fca5a5', fontSize: 18, fontWeight: '700' },
  exitBtn:          { backgroundColor: '#450a0a', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:      { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  materialBadge:    { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  materialText:     { color: '#e2e8f0', fontSize: 12 },
  thinking:         { fontSize: 18 },
  subheader:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  goal:             { flex: 1, color: '#f97316', fontSize: 12 },
  moveBadge:        { backgroundColor: '#7c2d12', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', minWidth: 48 },
  moveBadgeUrgent:  { backgroundColor: '#dc2626' },
  moveCount:        { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  moveLabel:        { color: '#fca5a5', fontSize: 9 },
  boardWrap:        { position: 'relative', flex: 1 },
  overlay:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.87)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  resultEmoji:      { fontSize: 72 },
  resultTitle:      { color: '#fff', fontSize: 32, fontWeight: '900' },
  resultGold:       { color: '#ffd700', fontSize: 24, fontWeight: '800' },
  continueBtn:      { marginTop: 16, backgroundColor: '#ea580c', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
});
