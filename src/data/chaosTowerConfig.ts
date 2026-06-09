import type { Href } from 'expo-router';

export type ChaosNodeType = 'shop' | 'battle' | 'treasure' | 'boss';

export interface ChaosNodeDef {
  type: ChaosNodeType;
  icon: string;
  label: string;
  route: Href;
}

// Порядок узлов снизу вверх = порядок прохождения (currentFloor 0..5)
export const CHAOS_TOWER_NODES: ChaosNodeDef[] = [
  { type: 'shop',     icon: '🏪', label: 'Магазин 1', route: '/chaos-shop' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 1',     route: '/chaos-battle' },
  { type: 'treasure', icon: '💎', label: 'Сокровище', route: '/chaos-treasure' },
  { type: 'battle',   icon: '⚔️', label: 'Бой 2',     route: '/chaos-battle' },
  { type: 'shop',     icon: '🏪', label: 'Магазин 2', route: '/chaos-shop' },
  { type: 'boss',     icon: '👑', label: 'Босс',      route: '/chaos-boss-intro' },
];
