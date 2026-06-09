import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChessPieceSVG, type PieceKey } from '../components/chess/ChessPieceSVG';
import {
  useChaosModeStore, pieceInstanceId, type ChessPiece,
} from '../store/chaosModeStore';
import { CHAOS_EVENTS } from '../data/chaosEvents';
import { UPGRADE_DEFINITIONS } from '../data/chaosUpgrades';
import type { ChaosEventId, ChaosEventDef, PieceUpgrade, UpgradeType } from '../types/chaos';
import {
  findStrongestPieceId,
  pickAmbushVictim,
  pickTraitorVictimId,
  parsePieceId,
  describeAiBattle,
} from '../engine/chaosEventEngine';
import type { ChaosBattleNumber } from '../engine/chaosBattle';

// ────────── вспомогательные константы ──────────

const PIECE_DISPLAY_NAME: Partial<Record<ChessPiece, string>> = {
  k: 'Король', q: 'Ферзь', r: 'Ладья', b: 'Слон', n: 'Конь', p: 'Пешка',
};

const UPGRADABLE_PIECES: ChessPiece[] = ['q', 'r', 'b', 'n', 'p'];

// Тип фазы UI
type EventPhase =
  | 'intro'          // начальный экран — описание события и кнопки
  | 'pick_piece'     // выбор фигуры (кузнец, алхимик)
  | 'pick_upgrade'   // выбор улучшения (арсенал)
  | 'show_army'      // армия следующего врага (гадалка)
  | 'result';        // финальный результат + «Продолжить»

interface UpgradableInstance {
  id: string;
  pieceType: ChessPiece;
  pieceIndex: number;
  pieceKey: PieceKey;
  label: string;
}

function buildUpgradableInstances(pieces: ChessPiece[]): UpgradableInstance[] {
  const counts: Partial<Record<ChessPiece, number>> = {};
  const result: UpgradableInstance[] = [];
  for (const type of pieces) {
    if (!UPGRADABLE_PIECES.includes(type)) continue;
    const index = counts[type] ?? 0;
    counts[type] = index + 1;
    result.push({
      id: pieceInstanceId(type, index),
      pieceType: type,
      pieceIndex: index,
      pieceKey: `w${type.toUpperCase()}` as PieceKey,
      label: `${PIECE_DISPLAY_NAME[type] ?? type} ${index + 1}`,
    });
  }
  return result;
}

// Вычисляет случайное улучшение, совместимое с фигурой (учитывает категорию и уже купленные)
function pickRandomUpgrade(
  pieceId: string,
  _pieceType: ChessPiece,
  pieceUpgrades: PieceUpgrade[],
  getPieceUpgradeClass: (id: string) => 'attack' | 'defense' | null,
  isUpgradeAvailable: (cat: 'attack' | 'defense') => boolean,
  exclude?: UpgradeType,
): typeof UPGRADE_DEFINITIONS[number] | null {
  const existingTypes = new Set(
    pieceUpgrades
      .filter(u => `${u.pieceType}_${u.pieceIndex}` === pieceId)
      .map(u => u.upgradeType),
  );
  const existingClass = getPieceUpgradeClass(pieceId);

  const eligible = UPGRADE_DEFINITIONS.filter(def => {
    if (def.type === exclude) return false;
    if (existingTypes.has(def.type)) return false;
    if (existingClass && def.category !== existingClass) return false;
    if (!isUpgradeAvailable(def.category)) return false;
    return true;
  });

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// ────────── компонент экрана ──────────

export default function ChaosEventScreen() {
  const router = useRouter();

  const {
    pieces, gold, pieceUpgrades, currentFloor,
    pendingEventId, clearPendingEvent,
    nextRoute, setNextRoute,
    addPiece, removePiece, addGold, spendGold, addUpgrade, removeUpgrade,
    canAddUpgrade, getPieceUpgradeClass, isUpgradeAvailable,
    setLastEventCategory, setCursedPiece,
  } = useChaosModeStore();

  // eventId берётся из Zustand store (не из URL params — надёжнее при router.replace)
  const eventId = pendingEventId as ChaosEventId;
  const eventDef: ChaosEventDef | undefined = CHAOS_EVENTS.find(e => e.id === eventId);

  const [phase, setPhase] = useState<EventPhase>('intro');
  const [resultText, setResultText] = useState('');
  // Для pick_phase: что делаем с выбранной фигурой
  const [pickAction, setPickAction] = useState<'blacksmith' | 'alchemist'>('blacksmith');
  // Два улучшения для «Тайного арсенала»
  const [arsenalOptions, setArsenalOptions] = useState<typeof UPGRADE_DEFINITIONS>([]);
  // Для «Гадалки»: описание армии следующего врага
  const [armyDescription, setArmyDescription] = useState('');

  // Анимация появления (fade in 0.3с)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // Безопасный выход если eventId неизвестен — через useEffect чтобы не вызывать навигацию в рендере
  useEffect(() => {
    if (!eventDef) {
      router.replace('/chaos-tower');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!eventDef) return null;

  const isNegative = eventDef.category === 'negative';
  const isNeutral = eventDef.category === 'neutral';

  // ────── применение результатов простых событий ──────

  function applyAutoEffect(): string {
    switch (eventDef!.id) {
      case 'war_loot': {
        const amount = 70 + Math.floor(Math.random() * 51); // 70-120
        addGold(amount);
        setLastEventCategory('positive');
        return `+${amount} золота`;
      }
      case 'deserter': {
        const nCount = pieces.filter(p => p === 'n').length;
        const bCount = pieces.filter(p => p === 'b').length;
        const candidates: ChessPiece[] = [];
        if (nCount < 2) candidates.push('n');
        if (bCount < 2) candidates.push('b');
        const gained = candidates[Math.floor(Math.random() * candidates.length)] ?? 'n';
        addPiece(gained);
        setLastEventCategory('positive');
        return `${PIECE_DISPLAY_NAME[gained]} присоединился к твоей армии!`;
      }
      case 'enemy_ambush': {
        const victimId = pickAmbushVictim(pieces, pieceUpgrades);
        if (victimId) {
          const { pieceType } = parsePieceId(victimId);
          removePiece(pieceType);
          // Убираем все улучшения этой фигуры
          pieceUpgrades
            .filter(u => `${u.pieceType}_${u.pieceIndex}` === victimId)
            .forEach(u => removeUpgrade(u.id));
        }
        setLastEventCategory('negative');
        return victimId
          ? `Твой ${PIECE_DISPLAY_NAME[parsePieceId(victimId).pieceType] ?? '?'} был потерян.`
          : 'Армия отбила атаку без потерь.';
      }
      case 'traitor': {
        const victimId = pickTraitorVictimId(pieces, pieceUpgrades);
        if (victimId) {
          const { pieceType } = parsePieceId(victimId);
          removePiece(pieceType);
        }
        setLastEventCategory('negative');
        return victimId
          ? `Твой ${PIECE_DISPLAY_NAME[parsePieceId(victimId).pieceType] ?? '?'} оказался предателем.`
          : 'Предателя разоблачили до побега.';
      }
      case 'treasury_fire': {
        const lossRatio = 0.25 + Math.random() * 0.15; // 25-40%
        const lost = Math.round(gold * lossRatio);
        addGold(-lost);
        setLastEventCategory('negative');
        return `−${lost} золота сгорело в пожаре.`;
      }
      case 'curse': {
        const strongestId = findStrongestPieceId(pieces);
        if (strongestId) {
          setCursedPiece(strongestId);
          const { pieceType } = parsePieceId(strongestId);
          setLastEventCategory('negative');
          return `${PIECE_DISPLAY_NAME[pieceType] ?? '?'} проклята. В следующем бою она не сможет брать сильные фигуры.`;
        }
        setLastEventCategory('negative');
        return 'Проклятие не нашло достойной жертвы.';
      }
      default:
        return '';
    }
  }

  // ────── обработчики кнопок intro-фазы ──────

  function handlePositiveContinue() {
    switch (eventDef!.id) {
      case 'war_loot':
      case 'deserter':
        setResultText(applyAutoEffect());
        setPhase('result');
        break;
      case 'old_blacksmith':
        setPickAction('blacksmith');
        setPhase('pick_piece');
        break;
      case 'secret_arsenal': {
        // Генерируем два случайных улучшения без привязки к конкретной фигуре
        const all = UPGRADE_DEFINITIONS.filter(d => isUpgradeAvailable(d.category));
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        setArsenalOptions(shuffled.slice(0, 2));
        setPhase('pick_upgrade');
        break;
      }
    }
  }

  function handleNegativeContinue() {
    setResultText(applyAutoEffect());
    setPhase('result');
  }

  function handleNeutralAccept() {
    switch (eventDef!.id) {
      case 'relic_trader': {
        removePiece('r');
        pieceUpgrades.filter(u => u.pieceType === 'r').forEach(u => removeUpgrade(u.id));
        addPiece('n');
        addPiece('n');
        // Добавляем атакующие улучшения новым коням — их индексы = число уже имеющихся коней до добавления
        const existingKnights = pieces.filter(p => p === 'n').length; // ещё до addPiece выше
        for (let i = 0; i < 2; i++) {
          const idx = existingKnights + i;
          // id используется для проверки — переменная намеренно игнорируется ниже, addUpgrade создаёт свой id
          const _id = pieceInstanceId('n', idx); void _id;
          const def = UPGRADE_DEFINITIONS.find(d => d.category === 'attack' && d.type === 'berserk');
          if (def) {
            addUpgrade({
              id: `n_${idx}_${def.type}`,
              pieceType: 'n',
              pieceIndex: idx,
              upgradeType: def.type,
              category: 'attack',
              turnsOnPosition: 0,
              turnsAlive: 0,
            });
          }
        }
        setLastEventCategory('positive');
        setResultText('Ладья ушла. Два коня-берсерка присоединились к армии.');
        setPhase('result');
        break;
      }
      case 'alchemist':
        setPickAction('alchemist');
        setPhase('pick_piece');
        break;
      case 'fortune_teller': {
        if (!spendGold(60)) {
          setResultText('Не хватает золота.');
          setPhase('result');
          break;
        }
        // currentFloor уже увеличен после боя: 2 → следующий бой = 2, 4 → босс
        const nextBattle: ChaosBattleNumber = currentFloor <= 2 ? 2 : 'boss';
        setArmyDescription(describeAiBattle(nextBattle));
        setLastEventCategory('positive');
        setPhase('show_army');
        break;
      }
      case 'recruiter': {
        removePiece('p');
        removePiece('p');
        const gained: ChessPiece = Math.random() < 0.5 ? 'n' : 'b';
        addPiece(gained);
        setLastEventCategory('positive');
        setResultText(`Две пешки ушли. ${PIECE_DISPLAY_NAME[gained]} вступил в армию.`);
        setPhase('result');
        break;
      }
    }
  }

  function handleNeutralDecline() {
    setLastEventCategory('positive');
    setResultText('Ты отказался. Продолжаем путь.');
    setPhase('result');
  }

  // ────── выбор фигуры ──────

  function handlePickPiece(instance: UpgradableInstance) {
    if (pickAction === 'blacksmith') {
      if (!canAddUpgrade(instance.id)) {
        setResultText('У этой фигуры уже 2 улучшения.');
        setPhase('result');
        return;
      }
      const def = pickRandomUpgrade(
        instance.id, instance.pieceType, pieceUpgrades,
        getPieceUpgradeClass, isUpgradeAvailable,
      );
      if (!def) {
        setResultText('Для этой фигуры нет подходящих улучшений.');
        setPhase('result');
        return;
      }
      addUpgrade({
        id: `${instance.id}_${def.type}`,
        pieceType: instance.pieceType,
        pieceIndex: instance.pieceIndex,
        upgradeType: def.type,
        category: def.category,
        turnsOnPosition: 0,
        turnsAlive: 0,
      });
      setLastEventCategory('positive');
      setResultText(`${instance.label} получил улучшение «${def.name}» бесплатно!`);
      setPhase('result');
    } else {
      // Алхимик: снимаем первое улучшение с фигуры, добавляем два случайных
      const existing = pieceUpgrades.filter(u => `${u.pieceType}_${u.pieceIndex}` === instance.id);
      if (existing.length === 0) {
        setResultText('У этой фигуры нет улучшений для снятия.');
        setPhase('result');
        return;
      }
      const removed = existing[0];
      removeUpgrade(removed.id);

      const results: string[] = [];
      for (let i = 0; i < 2; i++) {
        const def = pickRandomUpgrade(
          instance.id, instance.pieceType,
          pieceUpgrades.filter(u => u.id !== removed.id), // не учитываем только что снятое
          getPieceUpgradeClass, isUpgradeAvailable,
          removed.upgradeType,
        );
        if (def && canAddUpgrade(instance.id)) {
          addUpgrade({
            id: `${instance.id}_${def.type}_alchemy`,
            pieceType: instance.pieceType,
            pieceIndex: instance.pieceIndex,
            upgradeType: def.type,
            category: def.category,
            turnsOnPosition: 0,
            turnsAlive: 0,
          });
          results.push(def.name);
        }
      }
      setLastEventCategory('positive');
      setResultText(
        results.length > 0
          ? `«${removed.upgradeType}» снято. Получено: ${results.join(', ')}.`
          : `«${removed.upgradeType}» снято. Новых улучшений нет (лимит).`,
      );
      setPhase('result');
    }
  }

  // ────── выбор улучшения (арсенал) ──────

  function handlePickUpgrade(def: typeof UPGRADE_DEFINITIONS[number]) {
    // Тайный арсенал — применяем к самой ценной не королевской фигуре с свободным слотом
    const instances = buildUpgradableInstances(pieces);
    const target = instances.find(inst =>
      canAddUpgrade(inst.id) &&
      (!getPieceUpgradeClass(inst.id) || getPieceUpgradeClass(inst.id) === def.category),
    );
    if (!target) {
      setLastEventCategory('positive');
      setResultText(`«${def.name}» — нет подходящей фигуры для применения.`);
      setPhase('result');
      return;
    }
    addUpgrade({
      id: `${target.id}_${def.type}_arsenal`,
      pieceType: target.pieceType,
      pieceIndex: target.pieceIndex,
      upgradeType: def.type,
      category: def.category,
      turnsOnPosition: 0,
      turnsAlive: 0,
    });
    setLastEventCategory('positive');
    setResultText(`${target.label} получил «${def.name}» бесплатно!`);
    setPhase('result');
  }

  // ────── навигация после события ──────

  function handleFinish() {
    const destination = nextRoute ?? '/chaos-tower';
    clearPendingEvent();
    setNextRoute(null);
    router.replace(destination);
  }

  // ────── рендер ──────

  const upgradableInstances = buildUpgradableInstances(pieces);
  const pickablePieces = pickAction === 'alchemist'
    ? upgradableInstances.filter(inst => pieceUpgrades.some(u => `${u.pieceType}_${u.pieceIndex}` === inst.id))
    : upgradableInstances.filter(inst => canAddUpgrade(inst.id));

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.icon}>{eventDef.icon}</Text>
              <Text style={[styles.name, isNegative && styles.nameNegative, !isNegative && !isNeutral && styles.namePositive]}>
                {eventDef.name}
              </Text>
              <Text style={styles.category}>
                {eventDef.category === 'positive' ? '✨ Положительное' : eventDef.category === 'neutral' ? '⚖️ Нейтральное' : '☠️ Отрицательное'}
              </Text>
              <Text style={styles.description}>{eventDef.description}</Text>
            </ScrollView>

            <View style={styles.footer}>
              {isNeutral && eventDef.optionAccept ? (
                <>
                  <Pressable style={styles.btnDecline} onPress={handleNeutralDecline}>
                    <Text style={styles.btnDeclineText}>{eventDef.optionDecline ?? 'Отказать'}</Text>
                  </Pressable>
                  <Pressable style={styles.btnAccept} onPress={handleNeutralAccept}>
                    <Text style={styles.btnAcceptText}>{eventDef.optionAccept}</Text>
                  </Pressable>
                </>
              ) : isNegative ? (
                <Pressable style={styles.btnNegative} onPress={handleNegativeContinue}>
                  <Text style={styles.btnAcceptText}>Понятно</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.btnAccept} onPress={handlePositiveContinue}>
                  <Text style={styles.btnAcceptText}>
                    {eventDef.id === 'old_blacksmith' ? 'Выбрать фигуру' :
                     eventDef.id === 'secret_arsenal' ? 'Выбрать улучшение' : 'Принять'}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* ── PICK PIECE ── */}
        {phase === 'pick_piece' && (
          <>
            <Text style={styles.phaseTitle}>
              {pickAction === 'blacksmith' ? 'Выбери фигуру для улучшения' : 'Выбери фигуру (снять улучшение)'}
            </Text>
            <ScrollView contentContainerStyle={styles.pieceGrid} showsVerticalScrollIndicator={false}>
              {pickablePieces.length === 0 ? (
                <Text style={styles.emptyText}>Нет подходящих фигур.</Text>
              ) : (
                pickablePieces.map(inst => (
                  <Pressable key={inst.id} style={styles.pieceCard} onPress={() => handlePickPiece(inst)}>
                    <ChessPieceSVG pieceKey={inst.pieceKey} size={44} />
                    <Text style={styles.pieceCardLabel}>{inst.label}</Text>
                  </Pressable>
                ))
              )}
              {pickablePieces.length === 0 && (
                <Pressable style={styles.btnAccept} onPress={() => { setResultText('Нет подходящих фигур.'); setPhase('result'); }}>
                  <Text style={styles.btnAcceptText}>Продолжить</Text>
                </Pressable>
              )}
            </ScrollView>
          </>
        )}

        {/* ── PICK UPGRADE ── */}
        {phase === 'pick_upgrade' && (
          <>
            <Text style={styles.phaseTitle}>Выбери одно улучшение</Text>
            <ScrollView contentContainerStyle={styles.upgradeGrid} showsVerticalScrollIndicator={false}>
              {arsenalOptions.map(def => (
                <Pressable key={def.type} style={styles.upgradeCard} onPress={() => handlePickUpgrade(def)}>
                  <Text style={styles.upgradeIcon}>
                    {def.category === 'attack' ? '🔴' : '🔵'}
                  </Text>
                  <Text style={styles.upgradeName}>{def.name}</Text>
                  <Text style={styles.upgradeDesc}>{def.description}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── SHOW ARMY ── */}
        {phase === 'show_army' && (
          <>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.icon}>🔮</Text>
              <Text style={styles.name}>Армия следующего врага</Text>
              <Text style={styles.armyText}>{armyDescription}</Text>
            </ScrollView>
            <View style={styles.footer}>
              <Pressable style={styles.btnAccept} onPress={handleFinish}>
                <Text style={styles.btnAcceptText}>Продолжить</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && (
          <>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.icon}>{eventDef.icon}</Text>
              <Text style={styles.resultText}>{resultText}</Text>
            </ScrollView>
            <View style={styles.footer}>
              <Pressable style={styles.btnAccept} onPress={handleFinish} testID="chaos-event-continue-btn">
                <Text style={styles.btnAcceptText}>Продолжить</Text>
              </Pressable>
            </View>
          </>
        )}

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0a0f1e' },
  content: { flex: 1 },

  scroll:  { alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 20 },

  icon:    { fontSize: 64, marginBottom: 16 },
  name:    { fontSize: 24, fontWeight: '900', color: '#e2e8f0', textAlign: 'center', marginBottom: 6 },
  namePositive: { color: '#4ade80' },
  nameNegative: { color: '#f87171' },

  category: { fontSize: 13, color: '#64748b', marginBottom: 20, fontWeight: '600' },
  description: {
    fontSize: 16, color: '#cbd5e1', textAlign: 'center', lineHeight: 24,
  },
  resultText: {
    fontSize: 18, color: '#e2e8f0', textAlign: 'center', lineHeight: 28, marginTop: 20,
  },
  armyText: {
    fontSize: 20, color: '#a78bfa', textAlign: 'center', lineHeight: 30,
    marginTop: 20, fontWeight: '700',
  },

  phaseTitle: {
    fontSize: 18, color: '#e2e8f0', fontWeight: '800',
    textAlign: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 16,
  },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 20 },

  pieceGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 20,
  },
  pieceCard: {
    width: 80, alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingVertical: 12, gap: 6,
    borderWidth: 2, borderColor: '#334155',
  },
  pieceCardLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

  upgradeGrid: {
    paddingHorizontal: 16, paddingBottom: 20, gap: 12,
  },
  upgradeCard: {
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 16, borderWidth: 2, borderColor: '#334155',
    gap: 6,
  },
  upgradeIcon: { fontSize: 20 },
  upgradeName: { color: '#e2e8f0', fontSize: 16, fontWeight: '800' },
  upgradeDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },

  footer: {
    flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12,
    gap: 12, borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  btnAccept: {
    flex: 1, backgroundColor: '#7c3aed', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnAcceptText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  btnDecline: {
    flex: 1, borderWidth: 1, borderColor: '#334155', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnDeclineText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  btnNegative: {
    flex: 1, backgroundColor: '#991b1b', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
});
