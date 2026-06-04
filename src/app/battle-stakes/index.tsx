import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, SafeAreaView, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../components/chess/ChessBoard';
import { StockfishBridgeView } from '../../components/engine/StockfishBridgeView';
import type { StockfishBridgeRef } from '../../components/engine/StockfishBridgeView';
import type { MoveResult } from '../../engine/chessLogic';
import { generateQuickBattlePosition, countMaterial } from '../../engine/positionGenerator';
import { useRunStore } from '../../store/runStore';
import { eloToSkillLevel } from '../../engine/stockfish';
import {
  PIECE_STAKE_CONFIGS,
  computePieceStakeGold,
  stakeIsPossible,
  countWhitePieceInFen,
  removePieceFromFen,
  type PieceStakeConfig,
} from '../../engine/stakesEngine';

const BLITZ_MOVES = 10;
const PLAYER_COLOR = 'w' as const;

type Phase = 'select' | 'battle' | 'result';

export default function BattleStakesPage() {
  const router = useRouter();
  const {
    nodes, currentNodeIndex, gold, currentFen,
    earnGold, completeNode, setCurrentFen, isActive,
  } = useRunStore();

  const currentNode = nodes[currentNodeIndex];
  const opponentElo = (currentNode?.chapterElo ?? 550) + 100;
  const skillLevel = eloToSkillLevel(opponentElo);

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedId, setSelectedId] = useState<string>('none');

  const [startFen] = useState(() => generateQuickBattlePosition());
  const [chess] = useState(() => new Chess(startFen));
  const [boardKey, setBoardKey] = useState(0);
  const [playerMoves, setPlayerMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  const [battleResult, setBattleResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');
  const [goldEarned, setGoldEarned] = useState(0);

  const engineRef = useRef<StockfishBridgeRef>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);
  const stakeConfigRef = useRef<PieceStakeConfig>(PIECE_STAKE_CONFIGS[0]);

  if (!isActive) { router.replace('/'); return null; }

  useEffect(() => () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); }, []);

  const sendToEngine = useCallback((cmd: string) => engineRef.current?.send(cmd), []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
    sendToEngine(`setoption name Skill Level value ${skillLevel}`);
  }, [skillLevel, sendToEngine]);

  function handleExit() {
    Alert.alert(
      'Выйти из боя?',
      'Прогресс потеряется.',
      [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => router.replace('/adventure') },
      ],
    );
  }

  function finishBattle(r: 'win' | 'lose' | 'draw', reason: string) {
    if (doneRef.current) return;
    doneRef.current = true;
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

    const cfg = stakeConfigRef.current;
    const earned = computePieceStakeGold(r, cfg.multiplier);
    setGoldEarned(earned);
    setBattleResult(r);
    setResultReason(reason);

    const endFen = chess.fen();
    const finalFen =
      r === 'lose' && cfg.pieceType
        ? removePieceFromFen(endFen, cfg.pieceType)
        : endFen;
    setCurrentFen(finalFen);

    if (earned > 0) earnGold(earned);
    completeNode(currentNodeIndex);
    setPhase('result');
  }

  function checkMaterialResult() {
    const pm = countMaterial(chess, PLAYER_COLOR);
    const am = countMaterial(chess, 'b');
    if (pm > am) finishBattle('win', `Материал: ${pm}:${am}`);
    else if (am > pm) finishBattle('lose', `Материал: ${pm}:${am}`);
    else finishBattle('draw', 'Равный материал');
  }

  const applyAIMove = useCallback((uci: string) => {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as 'q') ?? 'q' });
      if (!move) { setIsAIThinking(false); return; }
      setBoardKey(k => k + 1);
      setIsAIThinking(false);
      if (chess.isCheckmate()) finishBattle('lose', 'Мат!');
      else if (chess.isDraw() || chess.isStalemate()) finishBattle('draw', 'Ничья');
    } catch { setIsAIThinking(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess]);

  const requestAIMove = useCallback(() => {
    if (chess.isGameOver() || chess.turn() === PLAYER_COLOR || doneRef.current) return;
    setIsAIThinking(true);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      if (chess.turn() === PLAYER_COLOR || chess.isGameOver() || doneRef.current) return;
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return;
      const m = moves[Math.floor(Math.random() * moves.length)];
      applyAIMove(`${m.from}${m.to}${m.promotion ?? ''}`);
    }, 1500);
    sendToEngine(`position fen ${chess.fen()}`);
    sendToEngine('go movetime 400');
  }, [chess, applyAIMove, sendToEngine]);

  const handleEngineMessage = useCallback((line: string) => {
    if (!line.startsWith('bestmove')) return;
    const uci = line.split(' ')[1];
    if (!uci || uci === '0000') { setIsAIThinking(false); return; }
    applyAIMove(uci);
  }, [applyAIMove]);

  useEffect(() => {
    if (phase === 'battle' && engineReady && chess.turn() !== PLAYER_COLOR) requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, phase]);

  const handleMove = useCallback((moveResult: MoveResult) => {
    if (!moveResult.success || doneRef.current) return;
    const newCount = playerMoves + 1;
    setPlayerMoves(newCount);
    setBoardKey(k => k + 1);
    if (moveResult.isCheckmate) { finishBattle('win', 'Мат!'); return; }
    if (moveResult.isDraw || moveResult.isStalemate) { finishBattle('draw', 'Ничья'); return; }
    if (newCount >= BLITZ_MOVES) { checkMaterialResult(); return; }
    requestAIMove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMoves, chess, requestAIMove]);

  function handleStartBattle() {
    const config = PIECE_STAKE_CONFIGS.find(s => s.id === selectedId) ?? PIECE_STAKE_CONFIGS[0];
    stakeConfigRef.current = config;
    doneRef.current = false;
    setPhase('battle');
  }

  const movesLeft = BLITZ_MOVES - playerMoves;
  const boardDisabled = phase === 'result' || isAIThinking || chess.turn() !== PLAYER_COLOR;
  const activeCfg = stakeConfigRef.current;

  const goldDisplay = (() => {
    if (!battleResult) return '';
    if (battleResult === 'lose' && activeCfg.pieceType) {
      return `${activeCfg.symbol} потеряна`;
    }
    return `+${goldEarned} 💰`;
  })();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Pre-warm engine during stake selection */}
      <StockfishBridgeView ref={engineRef} onMessage={handleEngineMessage} onReady={handleEngineReady} />

      {/* ── SELECT PHASE ─────────────────────────────────────────── */}
      {phase === 'select' && (
        <View style={styles.selectContainer}>
          <View style={styles.selectHeader}>
            <Text style={styles.selectTitle}>⚡ Блиц-ставка</Text>
            <Text style={styles.goldBadge}>💰 {gold}</Text>
            <Pressable style={styles.exitBtn} onPress={handleExit} testID="exit-battle-btn">
              <Text style={styles.exitBtnText}>Выход</Text>
            </Pressable>
          </View>
          <Text style={styles.selectSubtitle}>Поставь фигуру на кон:</Text>
          <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContent}>
            {PIECE_STAKE_CONFIGS.map(config => {
              const possible = stakeIsPossible(config, currentFen);
              const count = config.pieceType ? countWhitePieceInFen(currentFen, config.pieceType) : 0;
              const winGold = computePieceStakeGold('win', config.multiplier);
              const isSelected = selectedId === config.id;
              return (
                <Pressable
                  key={config.id}
                  testID={`stake-option-${config.id}`}
                  style={[
                    styles.stakeCard,
                    { backgroundColor: config.color, borderColor: config.borderColor },
                    isSelected && styles.stakeCardSelected,
                    !possible && styles.stakeCardDisabled,
                  ]}
                  onPress={() => possible && setSelectedId(config.id)}
                >
                  <Text style={styles.stakeSymbol}>{config.symbol}</Text>
                  <View style={styles.stakeInfo}>
                    <Text style={[styles.stakeLabel, !possible && styles.dimText]}>
                      {config.label}
                    </Text>
                    {config.pieceType !== null && (
                      <Text style={[styles.stakeCount, !possible && styles.dimText]}>
                        {possible ? `Осталось: ${count}` : 'Нет такой фигуры'}
                      </Text>
                    )}
                    <Text style={[styles.stakeWin, !possible && styles.dimText]}>
                      {`Победа: +${winGold} 💰 (×${config.multiplier})`}
                    </Text>
                  </View>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.loseWarning}>Проигрыш = теряешь фигуру навсегда</Text>
          <Pressable testID="start-battle-btn" style={styles.startBtn} onPress={handleStartBattle}>
            <Text style={styles.startBtnText}>⚡ Начать бой!</Text>
          </Pressable>
        </View>
      )}

      {/* ── BATTLE + RESULT PHASE ────────────────────────────────── */}
      {phase !== 'select' && (
        <>
          <View style={styles.battleHeader}>
            <Text style={styles.battleTitle}>⚡ Блиц</Text>
            <Pressable style={styles.exitBtn} onPress={handleExit} testID="exit-battle-btn">
              <Text style={styles.exitBtnText}>Выход</Text>
            </Pressable>
            <Text style={styles.stakeBadge}>
              {activeCfg.pieceType
                ? `${activeCfg.symbol} ×${activeCfg.multiplier}`
                : 'Без ставки'}
            </Text>
            <View style={[styles.moveBadge, movesLeft <= 3 && styles.moveBadgeUrgent]}>
              <Text style={styles.moveCount}>{movesLeft}</Text>
              <Text style={styles.moveLabel}>ходов</Text>
            </View>
            {isAIThinking && <Text style={styles.thinking}>⏳</Text>}
          </View>

          <ChessBoard
            key={boardKey}
            chess={chess}
            playerColor={PLAYER_COLOR}
            onMove={handleMove}
            disabled={boardDisabled}
          />

          <View style={styles.battleFooter}>
            <Text style={styles.goal}>🎯 Мат или больше материала за {BLITZ_MOVES} ходов</Text>
          </View>

          {phase === 'result' && battleResult && (
            <View style={styles.overlay}>
              <Text style={styles.resultEmoji}>
                {battleResult === 'win' ? '🏆' : battleResult === 'lose' ? '💀' : '🤝'}
              </Text>
              <Text style={styles.resultTitle}>
                {battleResult === 'win' ? 'Победа!' : battleResult === 'lose' ? 'Поражение' : 'Ничья'}
              </Text>
              <Text style={styles.resultReason}>{resultReason}</Text>
              {activeCfg.pieceType && (
                <Text style={styles.stakeFormula}>
                  {battleResult === 'win'
                    ? `${activeCfg.symbol} × ${activeCfg.multiplier}`
                    : battleResult === 'draw'
                      ? `${activeCfg.symbol} возвращена`
                      : `${activeCfg.symbol} потеряна`}
                </Text>
              )}
              <Text style={[
                styles.goldEarned,
                battleResult === 'lose' && activeCfg.pieceType != null && styles.goldLost,
              ]}>
                {goldDisplay}
              </Text>
              <Pressable
                testID="stakes-continue"
                style={styles.continueBtn}
                onPress={() => router.replace('/adventure')}
              >
                <Text style={styles.continueBtnText}>Продолжить</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#0d0d1a' },

  // select phase
  selectContainer:   { flex: 1, paddingHorizontal: 16 },
  selectHeader:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 8 },
  selectTitle:       { flex: 1, color: '#e2e8f0', fontSize: 20, fontWeight: '800' },
  goldBadge:         { color: '#f59e0b', fontSize: 16, fontWeight: '700' },
  exitBtn:           { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  exitBtnText:       { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  selectSubtitle:    { color: '#64748b', fontSize: 13, marginBottom: 12 },
  optionsList:       { flex: 1 },
  optionsContent:    { gap: 10, paddingBottom: 4 },
  stakeCard:         { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 2, padding: 14, gap: 12 },
  stakeCardSelected: { borderWidth: 3 },
  stakeCardDisabled: { opacity: 0.4 },
  stakeSymbol:       { fontSize: 30, width: 36, textAlign: 'center' },
  stakeInfo:         { flex: 1, gap: 2 },
  stakeLabel:        { color: '#e2e8f0', fontSize: 16, fontWeight: '700' },
  stakeCount:        { color: '#94a3b8', fontSize: 12 },
  stakeWin:          { color: '#86efac', fontSize: 13 },
  dimText:           { color: '#475569' },
  checkMark:         { color: '#22c55e', fontSize: 20, fontWeight: '900' },
  loseWarning:       { color: '#ef4444', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 4 },
  startBtn:          { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginVertical: 12 },
  startBtnText:      { color: '#fff', fontSize: 18, fontWeight: '800' },

  // battle phase
  battleHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  battleTitle:       { flex: 1, color: '#e2e8f0', fontSize: 18, fontWeight: '700' },
  stakeBadge:        { color: '#f59e0b', fontSize: 14, fontWeight: '700' },
  moveBadge:         { backgroundColor: '#1e3a5f', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, alignItems: 'center', minWidth: 52 },
  moveBadgeUrgent:   { backgroundColor: '#7f1d1d' },
  moveCount:         { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  moveLabel:         { color: '#94a3b8', fontSize: 10 },
  thinking:          { fontSize: 20 },
  battleFooter:      { paddingHorizontal: 16, paddingVertical: 8 },
  goal:              { color: '#64748b', fontSize: 12, textAlign: 'center' },

  // result overlay
  overlay:           { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  resultEmoji:       { fontSize: 72 },
  resultTitle:       { color: '#fff', fontSize: 36, fontWeight: '900' },
  resultReason:      { color: '#94a3b8', fontSize: 16 },
  stakeFormula:      { color: '#a78bfa', fontSize: 18, fontWeight: '700' },
  goldEarned:        { color: '#ffd700', fontSize: 30, fontWeight: '900' },
  goldLost:          { color: '#ef4444' },
  continueBtn:       { marginTop: 16, backgroundColor: '#7c3aed', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 14 },
  continueBtnText:   { color: '#fff', fontSize: 17, fontWeight: '800' },
});
