import type { Href } from 'expo-router';

export type ChaosNodeType = 'shop' | 'battle' | 'treasure' | 'boss' | 'choice';

// Вариант маршрута на узле выбора (choice) — battleIndex ссылается на LEVEL_CONFIGS.battles
// текущего уровня ('elite' — eliteBattle, 'boss' — bossConfig)
export interface ChaosChoiceOption {
  label: string;
  sublabel: string;
  route: Href;
  battleIndex: number | 'elite' | 'boss';
  style: 'danger' | 'normal';
}

export interface ChaosNodeDef {
  type: ChaosNodeType;
  icon: string;
  label: string;
  route: Href;
  // Для battle/boss — индекс боя в LEVEL_CONFIGS.battles ('elite'/'boss' — отдельные конфиги)
  battleIndex?: number | 'elite' | 'boss';
  // Для choice — варианты маршрутов дальше по башне
  options?: ChaosChoiceOption[];
}

// Уровень 1 — порядок узлов снизу вверх = порядок прохождения (currentFloor 0..7)
// floor 0: начальный магазин (автоматически открывается tower-экраном при currentFloor===0)
// floor 1: Бой 1 (battleIndex=0 → ACT_1_CONFIG.nodes[0] = standard, elo=800)
// floor 2: Охота (battleIndex=1 → ACT_1_CONFIG.nodes[1] = queen_hunt, elo=1000)
// floor 3: Магазин
// floor 4: Бой 2 (battleIndex=2 → ACT_1_CONFIG.nodes[2] = standard, elo=1100)
// floor 5: Элита (battleIndex='elite' → elo=1300, прямой редирект в магазин после победы)
// floor 6: Магазин
// floor 7: Босс
export const CHAOS_TOWER_NODES: ChaosNodeDef[] = [
  { type: 'shop',     icon: '🏪', label: 'Магазин 1', route: '/chaos-shop' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 1',     route: '/chaos-battle', battleIndex: 0 },
  { type: 'battle',   icon: '🎯', label: 'Охота',      route: '/chaos-battle', battleIndex: 1 },
  { type: 'shop',     icon: '🏪', label: 'Магазин 2', route: '/chaos-shop' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 2',     route: '/chaos-battle', battleIndex: 2 },
  { type: 'battle',   icon: '💀', label: 'Элита',     route: '/chaos-battle', battleIndex: 'elite' },
  { type: 'shop',     icon: '🏪', label: 'Магазин 3', route: '/chaos-shop' },
  { type: 'boss',     icon: '👑', label: 'Босс',      route: '/chaos-boss-intro', battleIndex: 'boss' },
];

// Уровень 2 — Долина Коней, с выбором маршрута после Боя 1 (floor 2)
export const LEVEL_2_TOWER: ChaosNodeDef[] = [
  { type: 'shop',     icon: '🏪', label: 'Магазин 1', route: '/chaos-shop' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 1',     route: '/chaos-battle', battleIndex: 0 },
  {
    type: 'choice',
    icon: '🔀',
    label: 'Выбор маршрута',
    route: '/chaos-choice',
    options: [
      {
        label: '⚔️ Элита',
        sublabel: 'Сложнее, но после победы — бесплатный магазин',
        route: '/chaos-battle',
        battleIndex: 'elite',
        style: 'danger',
      },
      {
        label: '🛡️ Обычный бой',
        sublabel: 'Безопаснее',
        route: '/chaos-battle',
        battleIndex: 1,
        style: 'normal',
      },
    ],
  },
  { type: 'battle',   icon: '⚔️', label: 'Бой 3', route: '/chaos-battle', battleIndex: 2 },
  { type: 'battle',   icon: '⚔️', label: 'Бой 4', route: '/chaos-battle', battleIndex: 3 },
  { type: 'shop',     icon: '🏪', label: 'Магазин 2', route: '/chaos-shop' },
  { type: 'boss',     icon: '👑', label: 'Босс',      route: '/chaos-boss-intro', battleIndex: 'boss' },
];

// Уровень 3 — Храм Диагоналей: после Боя 4 — обязательная элита перед вторым магазином и боссом
export const LEVEL_3_TOWER: ChaosNodeDef[] = [
  { type: 'shop',     icon: '🏪', label: 'Магазин 1', route: '/chaos-shop' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 1',     route: '/chaos-battle', battleIndex: 0 },
  {
    type: 'choice',
    icon: '🔀',
    label: 'Выбор маршрута',
    route: '/chaos-choice',
    options: [
      {
        label: '⚔️ Элита',
        sublabel: 'Сложнее, но после победы — бесплатный магазин',
        route: '/chaos-battle',
        battleIndex: 'elite',
        style: 'danger',
      },
      {
        label: '🛡️ Обычный бой',
        sublabel: 'Безопаснее',
        route: '/chaos-battle',
        battleIndex: 1,
        style: 'normal',
      },
    ],
  },
  { type: 'battle',   icon: '⚔️', label: 'Бой 3',     route: '/chaos-battle', battleIndex: 2 },
  { type: 'battle',   icon: '⚔️', label: 'Бой 4',     route: '/chaos-battle', battleIndex: 3 },
  { type: 'battle',   icon: '💀', label: 'Элита',     route: '/chaos-battle', battleIndex: 'elite' },
  { type: 'shop',     icon: '🏪', label: 'Магазин 2', route: '/chaos-shop' },
  { type: 'boss',     icon: '👑', label: 'Босс',      route: '/chaos-boss-intro', battleIndex: 'boss' },
];

const TOWER_CONFIGS: Record<number, ChaosNodeDef[]> = {
  1: CHAOS_TOWER_NODES,
  2: LEVEL_2_TOWER,
  3: LEVEL_3_TOWER,
};

export function getTowerNodes(level: number): ChaosNodeDef[] {
  return TOWER_CONFIGS[level] ?? CHAOS_TOWER_NODES;
}
