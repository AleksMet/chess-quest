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

// Уровень 1 — порядок узлов снизу вверх = порядок прохождения (currentFloor 0..5)
export const CHAOS_TOWER_NODES: ChaosNodeDef[] = [
  { type: 'shop',     icon: '🏪', label: 'Магазин 1', route: '/chaos-shop' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 1',     route: '/chaos-battle', battleIndex: 0 },
  { type: 'treasure', icon: '💎', label: 'Сокровище', route: '/chaos-treasure' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 2',     route: '/chaos-battle', battleIndex: 1 },
  { type: 'shop',     icon: '🏪', label: 'Магазин 2', route: '/chaos-shop' },
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

const TOWER_CONFIGS: Record<number, ChaosNodeDef[]> = {
  1: CHAOS_TOWER_NODES,
  2: LEVEL_2_TOWER,
};

export function getTowerNodes(level: number): ChaosNodeDef[] {
  return TOWER_CONFIGS[level] ?? CHAOS_TOWER_NODES;
}
