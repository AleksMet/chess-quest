import { ActConfig, BattleModifier, BattleType, ProgressNode } from '../types/mechanics'

export const ACT_1_CONFIG: ActConfig = {
  act: 1,
  startGold: 150,
  nodes: [
    { type: 'standard', elo: 800 },
    { type: 'objective_queen_hunt', elo: 1000 },
    { type: 'standard', elo: 1100 },
    { type: 'elite', elo: 1300 },
  ],
}

export const ACT_2_CONFIG: ActConfig = {
  act: 2,
  startGold: 120,
  nodes: [
    { type: 'standard', elo: 1000 },
    { type: 'objective_pawn_march', elo: 1100 },
    { type: 'standard', elo: 1200, isChoice: true },
    { type: 'objective_queen_hunt', elo: 1300 },
    { type: 'elite', elo: 1500 },
  ],
}

export const ACT_3_CONFIG: ActConfig = {
  act: 3,
  startGold: 100,
  nodes: [
    { type: 'standard', elo: 1200 },
    { type: 'objective_royal_shield', elo: 1300 },
    { type: 'standard', elo: 1400, isChoice: true },
    { type: 'objective_pawn_march', elo: 1500 },
    { type: 'elite', elo: 1600 },
  ],
}

export const ACT_CONFIGS = [ACT_1_CONFIG, ACT_2_CONFIG, ACT_3_CONFIG]

const MODIFIERS_ACT_1: BattleModifier[] = [
  'reinforced_pawns',
  'golden_zone',
  'weak_flank',
  'no_castling',
  // open_board убран — незаметен при малом количестве фигур
  'berserk_knight',
]

const MODIFIERS_ACT_2_3: BattleModifier[] = [
  ...MODIFIERS_ACT_1,
  'double_knights',
  'berserk_queen',
  'closed_board',
]

// Модификаторы, которые НЕ выпадают для конкретного персонажа
const INCOMPATIBLE_MODIFIERS: Record<string, BattleModifier[]> = {
  berserk:  ['no_castling'],
  guardian: ['no_castling', 'berserk_queen'],
  merchant: ['closed_board'],
}

// Objective-типы, которые не выпадают для конкретного персонажа
const INCOMPATIBLE_OBJECTIVES: Record<string, BattleType[]> = {
  berserk: ['objective_royal_shield'],
}

export function getRandomModifier(act: number, characterId: string): BattleModifier {
  const pool = act === 1 ? MODIFIERS_ACT_1 : MODIFIERS_ACT_2_3
  const excluded = INCOMPATIBLE_MODIFIERS[characterId] ?? []
  const available = pool.filter(m => !excluded.includes(m))
  return available[Math.floor(Math.random() * available.length)]
}

export function isBattleTypeAllowed(type: BattleType, characterId: string): boolean {
  const excluded = INCOMPATIBLE_OBJECTIVES[characterId] ?? []
  return !excluded.includes(type)
}

export const PROGRESS_NODES_ACT_1: ProgressNode[] = [
  { icon: '⚔️', label: 'Бой 1', type: 'standard' },
  { icon: '🎯', label: 'Объектив', type: 'objective_queen_hunt' },
  { icon: '🏪', label: 'Магазин', type: 'shop' },
  { icon: '⚔️', label: 'Бой 2', type: 'standard' },
  { icon: '💀', label: 'Элита', type: 'elite' },
  { icon: '🏪', label: 'Магазин', type: 'shop' },
  { icon: '👑', label: 'Босс', type: 'boss' },
]

export const PROGRESS_NODES_ACT_2: ProgressNode[] = [
  { icon: '⚔️', label: 'Бой 1', type: 'standard' },
  { icon: '🎯', label: 'Объектив', type: 'objective_pawn_march' },
  { icon: '⚔️', label: 'Бой/Элита', type: 'standard' },
  { icon: '🎯', label: 'Объектив', type: 'objective_queen_hunt' },
  { icon: '💀', label: 'Элита', type: 'elite' },
  { icon: '🏪', label: 'Магазин', type: 'shop' },
  { icon: '👑', label: 'Босс', type: 'boss' },
]

export const PROGRESS_NODES: Record<number, ProgressNode[]> = {
  1: PROGRESS_NODES_ACT_1,
  2: PROGRESS_NODES_ACT_2,
}

export function getCurrentBattleType(act: number, floor: number): BattleType {
  const nodes = PROGRESS_NODES[act]
  if (!nodes || !nodes[floor]) return 'standard'
  const nodeType = nodes[floor].type
  if (nodeType === 'boss') return 'elite'
  if (nodeType === 'shop' || nodeType === 'event') return 'standard'
  return nodeType as BattleType
}

export const MODIFIER_DESCRIPTIONS: Record<BattleModifier, string> = {
  reinforced_pawns: '💰 Усиленные пешки: +5 золота за каждую взятую пешку врага',
  golden_zone:      '⭐ Горячая зона: +15 золота за контроль d4/e4/d5/e5',
  weak_flank:       '⚡ Слабый фланг: ИИ давит с одного фланга',
  no_castling:      '🚫 Без рокировки: противник не рокирует',
  open_board:       '🌊 Открытая доска: больше пространства для атаки',
  berserk_knight:   '⚔️ Берсерк-конь: конь противника всегда берёт',
  double_knights:   '⚔️ Двойные кони: у противника два лишних коня',
  berserk_queen:    '👑 Берсерк-ферзь: ферзь противника всегда берёт',
  closed_board:     '🛡️ Закрытая доска: пешечные структуры заперты',
}
